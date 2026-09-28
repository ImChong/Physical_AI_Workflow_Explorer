/*
 * Sim2Real Debugger content: symptom → candidate causes → explanation / check / fix.
 * Based on common legged-robot / humanoid deployment practice. Ranges are examples, not specs.
 */
window.PAWE = window.PAWE || {};

PAWE.SYMPTOMS = [
  {
    id: "falls",
    label: "Robot falls immediately",
    hint: "Within the first second after the policy takes over.",
    causes: ["jointOrder", "jointSign", "defaultPose", "obsFrame", "kpkd", "torqueLimit"],
  },
  {
    id: "oscillates",
    label: "Robot oscillates / jitters",
    hint: "High-frequency shaking or limit cycles in one or more joints.",
    causes: ["kpkd", "policyFreq", "actionScale", "obsDelay", "velNoise", "actuatorDyn"],
  },
  {
    id: "delayed",
    label: "Motion is delayed / sluggish",
    hint: "The robot reacts late to commands or disturbances.",
    causes: ["obsDelay", "commJitter", "policyFreq", "actuatorDyn", "actionFilter"],
  },
  {
    id: "wrongDir",
    label: "Joint directions are wrong",
    hint: "A limb moves opposite to what sim shows, or the wrong limb moves.",
    causes: ["jointSign", "jointOrder", "defaultPose"],
  },
  {
    id: "unstableLater",
    label: "Policy becomes unstable after several seconds",
    hint: "Works at first, then degrades or drifts.",
    causes: ["historyInit", "stateEstimate", "commJitter", "thermal", "contactFriction"],
  },
];

PAWE.CAUSES = {
  jointOrder: {
    title: "Joint order mismatch",
    explain:
      "Simulators and robot SDKs enumerate joints differently (e.g. breadth-first vs. depth-first USD parsing, left/right grouping). The policy then reads joint i but commands joint j.",
    sim: "obs  = [q_hip_L, q_hip_R, q_knee_L, …]   (sim order)\npolicy ──► action[k] → joint k (sim order)",
    real: "obs  = [q_hip_L, q_knee_L, q_ankle_L, …] (SDK order)\npolicy ──► action[k] → WRONG joint",
    check: [
      "Print the joint-name list from sim and from the SDK side by side",
      "Command a single joint by index and watch which one moves",
    ],
    fix: ["Build an explicit name-based index map sim ↔ SDK and apply it to obs and actions"],
    link: { label: "Robot Joint Order Check Tool", url: "https://imchong.github.io/Robot_Joint_Order_Check_Tool_Online/" },
  },
  jointSign: {
    title: "Joint axis sign / zero offset",
    explain:
      "A joint axis defined as +Y in the URDF may be −Y in firmware, or the encoder zero differs from the URDF zero.",
    sim: "q_sim = +0.3 rad → knee bends forward",
    real: "q_real = +0.3 rad → knee bends backward   (sign flipped)",
    check: [
      "Move each joint by hand / small command and compare the sign in both worlds",
      "Compare the robot's calibrated zero pose with the URDF zero pose",
    ],
    fix: ["Apply per-joint sign and offset in the deployment adapter — never retrain for it"],
  },
  defaultPose: {
    title: "Default pose / action offset mismatch",
    explain:
      "Policies usually output offsets around a default joint pose: q_target = q_default + scale·a. A different q_default on the robot shifts every target.",
    sim: "q_target = q_default_sim + 0.25 · a",
    real: "q_target = q_default_real + 0.25 · a   (q_default differs)",
    check: ["Diff q_default in the training config vs. deployment config"],
    fix: ["Load q_default, action scale and joint order from the same exported config file"],
  },
  obsFrame: {
    title: "Observation frame / convention mismatch",
    explain:
      "IMU quaternion order (wxyz vs. xyzw), projected-gravity frame, or angular velocity in world vs. body frame differ between sim and SDK.",
    sim: "projected_gravity (body frame) = [0, 0, −1] standing",
    real: "projected_gravity = [0, −1, 0]   (wrong frame / quat order)",
    check: [
      "Hold the robot upright and still: projected gravity must be ≈ [0, 0, −1]",
      "Tilt forward: sign of the x component must match sim",
    ],
    fix: ["Unit-test the observation builder against logged sim observations"],
  },
  kpkd: {
    title: "Kp / Kd mismatch",
    explain:
      "The policy was trained with specific PD gains. Different real gains (or a different PD implementation / rate) change the closed-loop dynamics the policy expects.",
    sim: "τ = Kp·(q* − q) − Kd·q̇     Kp=100, Kd=2",
    real: "τ = Kp·(q* − q) − Kd·q̇     Kp=60,  Kd=0.5   (motor driver units differ)",
    check: [
      "Step-response test per joint: compare sim vs. real rise time and overshoot",
      "Confirm units of Kp/Kd in the motor driver (Nm/rad vs. scaled)",
    ],
    fix: ["Match gains; randomise Kp/Kd (e.g. ±20%) during training"],
    dr: "kp_scale = uniform(0.8, 1.2)\nkd_scale = uniform(0.8, 1.2)",
  },
  policyFreq: {
    title: "Policy frequency mismatch",
    explain:
      "Training ran the policy at physics_rate / decimation (e.g. 200 Hz / 4 = 50 Hz). Running at a different rate on the robot changes how long each action is held.",
    sim: "policy @ 50 Hz → each action held 20 ms",
    real: "policy @ 33 Hz (slow loop) → each action held 30 ms",
    check: [
      "Log policy loop timestamps on the robot; plot the period histogram",
      "Check for missed deadlines under load",
    ],
    fix: ["Run the policy on a fixed-rate timer; optimise inference until the period is met"],
  },
  actionScale: {
    title: "Action scaling mismatch",
    explain:
      "Action scale or clipping differs between training and deployment, so the same network output produces larger or smaller joint targets.",
    sim: "q_target = q_default + 0.25 · clip(a, −100, 100)",
    real: "q_target = q_default + 0.5 · a   (scale doubled, no clip)",
    check: ["Diff action_scale / clip values; log raw network outputs on the robot"],
    fix: ["Export scale & clip with the model; assert at load time"],
  },
  obsDelay: {
    title: "Observation delay",
    explain:
      "On the real robot the policy sees a state that is Δ ms old (sensor, bus, transport, inference). In sim it saw the current state, so it learned to act on fresh information.",
    sim: "observation(t)\n      ↓\n   policy\n      ↓\n  action(t)",
    real: "observation(t − Δ)\n      ↓\n   policy\n      ↓\n  action(t)",
    check: [
      "Measure sensor-timestamp → command-timestamp latency",
      "Replay a real log in sim with the measured Δ inserted — does sim reproduce the oscillation?",
    ],
    fix: ["Reduce latency (see Deployment Budget); randomise delay during training"],
    dr: "delay = random(0–30 ms)\nobs_buffer[t] → policy reads obs_buffer[t − delay]",
  },
  velNoise: {
    title: "Joint velocity noise",
    explain:
      "Real joint velocity often comes from finite-differencing encoders; noise is amplified by Kd and by the policy's velocity inputs.",
    sim: "q̇ = exact simulator velocity",
    real: "q̇ = (q_k − q_{k−1}) / dt   + quantisation noise",
    check: ["Plot q̇ while the robot stands still — it should be near zero"],
    fix: ["Add velocity noise in training; low-pass filter q̇ (mind the added delay)"],
    dr: "dq_obs = dq + normal(0, 1.5 rad/s)",
  },
  actuatorDyn: {
    title: "Actuator dynamics mismatch",
    explain:
      "Real motors have bandwidth limits, friction, backlash and torque-speed curves. An ideal PD actuator in sim responds instantly.",
    sim: "q* ──► ideal PD ──► τ (instant)",
    real: "q* ──► motor driver ──► lag + friction + saturation ──► τ",
    check: ["Chirp / step tests per joint; compare Bode or step response with sim"],
    fix: ["Model actuators (e.g. actuator network, DC-motor model) or randomise friction / armature"],
    dr: "joint_friction = uniform(0.0, 0.05)\narmature = uniform(0.01, 0.03)",
  },
  torqueLimit: {
    title: "Torque / effort limit mismatch",
    explain: "Sim allows more torque than the real motors (or than the safety limit configured on the robot).",
    sim: "effort_limit = 300 Nm (default)",
    real: "effort_limit = 120 Nm (real motor)",
    check: ["Log commanded torque on the robot: is it saturating?"],
    fix: ["Set realistic effort limits in the asset; penalise torque in the reward"],
  },
  commJitter: {
    title: "Communication jitter / dropped messages",
    explain: "DDS / ROS 2 / Ethernet delivery time varies; some cycles get stale or missing commands.",
    sim: "every step: fresh obs, fresh action",
    real: "some steps: stale obs, repeated action, bursts",
    check: ["ros2 topic hz and delay; histogram of inter-arrival times"],
    fix: ["Real-time kernel / executor, dedicated NIC, QoS tuning, randomise delay in training"],
  },
  actionFilter: {
    title: "Extra filtering on the robot",
    explain: "A low-pass filter or rate limiter added on the robot side for safety adds phase lag the policy never saw.",
    sim: "q* applied directly",
    real: "q* ──► low-pass (τ = 50 ms) ──► motor",
    check: ["Inspect the robot-side command path for filters / smoothing"],
    fix: ["Include the same filter in training, or remove it"],
  },
  historyInit: {
    title: "History buffer / last-action initialisation",
    explain:
      "Policies with observation history or last-action inputs can behave differently if the buffer is initialised with zeros on the robot but with valid states in sim.",
    sim: "history = [s_t, s_{t−1}, … ] all valid",
    real: "history = [s_t, 0, 0, … ] at start, filled over time",
    check: ["Log the full observation vector during the first seconds"],
    fix: ["Initialise buffers identically to training (e.g. repeat the first state)"],
  },
  stateEstimate: {
    title: "State estimation drift",
    explain: "Base linear velocity / height are estimated on the robot and drift; in sim they were ground truth.",
    sim: "base_lin_vel = ground truth",
    real: "base_lin_vel = estimator (drifts, lags)",
    check: ["Compare the estimator with mocap or a treadmill reference"],
    fix: ["Train without privileged states, or with the same estimator / noise model"],
  },
  thermal: {
    title: "Motor heating / battery sag",
    explain: "Torque capability drops as motors heat or battery voltage sags, so behaviour changes over time.",
    sim: "constant motor strength",
    real: "strength decreases over minutes",
    check: ["Log motor temperature and bus voltage alongside failures"],
    fix: ["Randomise motor strength; add thermal limits to the controller"],
    dr: "motor_strength = uniform(0.8, 1.1)",
  },
  contactFriction: {
    title: "Contact / friction mismatch",
    explain: "Foot or fingertip friction and restitution differ from sim; slip accumulates.",
    sim: "friction = 1.0 everywhere",
    real: "floor friction 0.4–1.2, foot pads wear",
    check: ["Look for foot slip in video; compare contact forces if available"],
    fix: ["Randomise friction and restitution; train on varied terrain"],
    dr: "friction = uniform(0.3, 1.25)",
  },
};
