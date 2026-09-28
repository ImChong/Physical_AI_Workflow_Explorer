/*
 * Workflow content.
 * Every product claim links to a public NVIDIA / upstream source (see SOURCES).
 * Numbers marked "example" are illustrative, robot dependent, and NOT official NVIDIA specs.
 */
window.PAWE = window.PAWE || {};

PAWE.SOURCES = {
  gr00tBlog: {
    label: "NVIDIA blog — Develop humanoid robot policies end-to-end with Isaac GR00T",
    url: "https://developer.nvidia.com/blog/develop-humanoid-robot-policies-end-to-end-with-nvidia-isaac-gr00t/",
  },
  gr00tRepo: { label: "NVIDIA/Isaac-GR00T (GitHub)", url: "https://github.com/NVIDIA/Isaac-GR00T" },
  gr00tPage: { label: "NVIDIA Isaac GR00T", url: "https://developer.nvidia.com/isaac/gr00t" },
  isaacLab: { label: "NVIDIA Isaac Lab / Isaac Lab-Arena", url: "https://developer.nvidia.com/isaac/lab" },
  isaacLabTeleop: {
    label: "Isaac Lab docs — Teleoperation & imitation learning",
    url: "https://isaac-sim.github.io/IsaacLab/main/source/overview/imitation-learning/teleop_imitation.html",
  },
  isaacSim: { label: "NVIDIA Isaac Sim", url: "https://developer.nvidia.com/isaac/sim" },
  cosmos: { label: "NVIDIA Cosmos", url: "https://www.nvidia.com/en-us/ai/cosmos/" },
  mimic: {
    label: "Cosmos Cookbook — GR00T-Mimic",
    url: "https://nvidia-cosmos.github.io/cosmos-cookbook/recipes/inference/transfer1/gr00t-mimic/inference.html",
  },
  dreams: {
    label: "Cosmos Cookbook — GR00T-Dreams synthetic trajectories",
    url: "https://nvidia-cosmos.github.io/cosmos-cookbook/recipes/end2end/gr00t-dreams/post-training.html",
  },
  synthBlog: {
    label: "NVIDIA blog — Synthetic trajectory data from world foundation models",
    url: "https://developer.nvidia.com/blog/enhance-robot-learning-with-synthetic-trajectory-data-generated-by-world-foundation-models",
  },
  newsroom: {
    label: "NVIDIA Newsroom — Cloud-to-robot computing platforms for physical AI",
    url: "https://nvidianews.nvidia.com/news/nvidia-powers-humanoid-robot-industry-with-cloud-to-robot-computing-platforms-for-physical-ai",
  },
  tensorrt: { label: "NVIDIA TensorRT", url: "https://developer.nvidia.com/tensorrt" },
  tensorrtDocs: { label: "TensorRT documentation", url: "https://docs.nvidia.com/deeplearning/tensorrt/latest/index.html" },
  thor: {
    label: "NVIDIA Jetson Thor",
    url: "https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/",
  },
  isaacRos: { label: "NVIDIA Isaac ROS", url: "https://developer.nvidia.com/isaac/ros" },
  isaacRosDocs: { label: "Isaac ROS documentation", url: "https://nvidia-isaac-ros.github.io/" },
  isaacRosBuffer: {
    label: "Isaac ROS — Migration from NITROS to rosidl::Buffer",
    url: "https://nvidia-isaac-ros.github.io/concepts/rosidl_buffer/nitros_migration.html",
  },
  ros2: { label: "ROS 2 documentation", url: "https://docs.ros.org/en/rolling/" },
  g1: { label: "Unitree G1", url: "https://www.unitree.com/g1" },
};

/* Six top-level stages used for colouring and the compact overview. */
PAWE.STAGES = [
  { id: "data", label: "Data" },
  { id: "sim", label: "Simulation" },
  { id: "learn", label: "Learning" },
  { id: "eval", label: "Evaluation" },
  { id: "deploy", label: "Deployment" },
  { id: "robot", label: "Robot" },
];

/*
 * Pipeline layout: each row is rendered top→bottom; a row with two ids is a parallel branch.
 */
PAWE.LAYOUT = [
  ["task"],
  ["teleop"],
  ["cosmos", "mimic"],
  ["isaacsim"],
  ["isaaclab"],
  ["gr00t"],
  ["arena"],
  ["tensorrt"],
  ["thor"],
  ["isaacros"],
  ["robot"],
];

PAWE.NODES = {
  task: {
    stage: "data",
    title: "Customer Task",
    tech: "Task & success definition",
    what: "A precise statement of what the robot must do, in which scene, and how success is measured.",
    why: "Every later choice — data volume, simulator fidelity, model type, compute budget — depends on the task. Vague tasks produce policies that cannot be evaluated.",
    whenNeeded: "Always. If you cannot write a success metric, you are not ready to collect data.",
    input: ["Business goal", "Robot embodiment (e.g. Unitree G1)", "Sensors & compute on board"],
    output: ["Task spec: objects, scene variations, success criteria", "Latency / frequency requirements", "Safety constraints"],
    bottleneck: [
      "Success metric not measurable in sim and on the real robot the same way",
      "Scope creep: 'grasp anything' instead of a bounded object set",
    ],
    debug: [
      "Write the eval protocol first: #trials, object set, initial-state distribution",
      "Check that every sensor the policy needs exists on the real robot",
    ],
    tools: [],
    sources: ["gr00tBlog"],
    engineer: {
      title: "Spec checklist",
      body: [
        "Embodiment: DoF, action space (joint / EEF), control interface",
        "Observation: cameras (count, resolution, FPS), proprioception, language",
        "Control: required policy rate, max end-to-end latency",
        "Evaluation: success rate target, #episodes, randomised initial states",
      ],
    },
  },

  teleop: {
    stage: "data",
    title: "Data Collection / Teleop",
    tech: "Isaac Teleop · Isaac Lab teleoperation",
    what: "Human demonstrations recorded by teleoperating the robot (real or simulated), e.g. with a VR headset or spacemouse.",
    why: "Imitation learning and VLA post-training need task-specific demonstrations. Real demos capture real physics and sensor noise that sim can miss.",
    whenNeeded: "When the task is hard to specify as a reward (dexterous manipulation, multi-step tasks) and you want the policy to imitate a human strategy.",
    input: ["Teleop device (VR headset / spacemouse / exoskeleton)", "Robot or simulated scene", "Task spec"],
    output: ["Episodes: synchronised images + robot state + actions", "Dataset in a standard format (e.g. LeRobot format)"],
    bottleneck: [
      "Human time: demos are slow and expensive to collect",
      "Inconsistent operator strategies → multimodal, noisy data",
      "Timestamp misalignment between cameras and joint states",
    ],
    debug: [
      "Replay recorded actions open-loop: does the robot reproduce the demo?",
      "Plot camera vs. joint-state timestamps; check drift and dropped frames",
      "Verify action semantics (absolute vs. delta, joint vs. EEF) match the model config",
    ],
    tools: [
      { name: "Isaac Teleop (VR via CloudXR)", src: "gr00tBlog" },
      { name: "Isaac Lab teleoperation & IL", src: "isaacLabTeleop" },
    ],
    sources: ["gr00tBlog", "isaacLabTeleop"],
    engineer: {
      title: "Reference data point",
      body: [
        "NVIDIA's end-to-end GR00T example collects 400 trajectories for a pick-and-place task and post-trains in LeRobot format (source: GR00T end-to-end blog).",
        "Record at a fixed control rate; store the rate in dataset metadata — the model's action horizon is defined in steps, not seconds.",
      ],
    },
  },

  cosmos: {
    stage: "data",
    title: "Synthetic World Data",
    tech: "NVIDIA Cosmos (world foundation models)",
    what: "World foundation models that generate or transform video/world states — e.g. Cosmos Predict (future video), Cosmos Transfer (re-render appearance), Cosmos Reason (physical reasoning VLM).",
    why: "Real demos cover few lighting conditions, textures and backgrounds. Generative augmentation multiplies visual diversity without new teleop hours.",
    whenNeeded: "When the policy is vision-based and fails under visual distribution shift (new table, lighting, background) — not when the failure is dynamics.",
    input: ["Seed videos / sim renders", "Text prompts or control signals (depth, segmentation)"],
    output: ["Visually diverse video / images", "GR00T-Dreams: synthetic trajectories from an image + language prompt"],
    bottleneck: [
      "Generated frames can violate physics or robot kinematics",
      "Action labels are not free: generated video needs actions inferred (e.g. inverse dynamics) in Dreams-style pipelines",
      "Compute cost of large generative models",
    ],
    debug: [
      "Filter generated clips (e.g. with a reasoning model) before training",
      "Ablate: train with / without synthetic data on the same eval set",
    ],
    tools: [
      { name: "Cosmos Predict / Transfer / Reason", src: "cosmos" },
      { name: "GR00T-Dreams blueprint", src: "dreams" },
    ],
    sources: ["cosmos", "dreams", "synthBlog"],
  },

  mimic: {
    stage: "data",
    title: "Synthetic Motion",
    tech: "Isaac GR00T-Mimic",
    what: "A blueprint that generates large numbers of synthetic manipulation trajectories from a small set of human demonstrations.",
    why: "Turns tens of demos into thousands by re-targeting object-centric sub-tasks to new object poses in simulation.",
    whenNeeded: "When you have a few good demos but need coverage of many initial object poses / layouts.",
    input: ["A few human demos (annotated into sub-tasks)", "Simulated scene (Isaac Sim / Isaac Lab)"],
    output: ["Large synthetic trajectory dataset with actions"],
    bottleneck: [
      "Generated trajectories that fail physically must be filtered (success check)",
      "Sub-task segmentation quality limits generation quality",
    ],
    debug: [
      "Track generation success rate per sub-task",
      "Visually inspect a random sample of generated episodes",
    ],
    tools: [{ name: "GR00T-Mimic blueprint", src: "mimic" }],
    sources: ["mimic", "synthBlog", "newsroom"],
    engineer: {
      title: "Reported scale",
      body: [
        "NVIDIA reports generating 780K synthetic trajectories (≈6.5K hours of demo-equivalent data) in 11 hours with GR00T-Mimic (source: NVIDIA newsroom / blog).",
      ],
    },
  },

  isaacsim: {
    stage: "sim",
    title: "Simulation",
    tech: "NVIDIA Isaac Sim",
    what: "Physically based robot simulator on Omniverse/OpenUSD with RTX sensor rendering.",
    why: "Train and validate without risking expensive physical hardware; reproduce rare or dangerous situations on demand.",
    whenNeeded: "Whenever you need scalable data, safe testing, or controllable randomisation — i.e. almost always before a real-robot rollout.",
    input: ["Robot USD (converted from URDF/MJCF)", "Scene + object assets", "Sensor configuration (cameras, IMU)"],
    output: ["Simulation environment", "Rendered sensor data + ground truth"],
    bottleneck: [
      "Wrong joint mapping / joint order after URDF → USD conversion",
      "Unrealistic contacts and friction",
      "Sensor mismatch: intrinsics, latency, noise",
    ],
    debug: [
      "Drive each joint individually and compare direction & limits with the real robot",
      "Compare camera intrinsics / FOV with the real sensor calibration",
      "Drop-test and push-test: compare trajectories with real logs",
    ],
    tools: [{ name: "Isaac Sim", src: "isaacSim" }],
    sources: ["isaacSim"],
    engineer: {
      title: "Asset sanity checks (example)",
      body: [
        "Joint names & order: sim ↔ SDK ↔ policy config must agree",
        "Joint drive: stiffness / damping as PD gains or as effort limits?",
        "Mass / inertia from CAD vs. URDF defaults",
        "Physics dt and solver iterations (example: 200 Hz physics for legged robots)",
      ],
    },
  },

  isaaclab: {
    stage: "learn",
    title: "Robot Learning",
    tech: "NVIDIA Isaac Lab",
    what: "Open-source, GPU-accelerated robot-learning framework (RL and imitation learning) with perception in the loop and multiple physics backends.",
    why: "Thousands of parallel environments make RL and large-scale data generation tractable on a single GPU.",
    whenNeeded: "RL for locomotion / whole-body control, IL on demos, or generating sim rollouts for foundation-model training.",
    input: ["Sim environment + task definition (observations, actions, rewards / demos)", "Domain randomisation config"],
    output: ["Trained policy (RL / IL)", "Sim rollouts / datasets"],
    bottleneck: [
      "Reward hacking / unnatural gaits in RL",
      "Over-fitting to sim physics (Sim2Real gap)",
      "Observation mismatch between training and deployment",
    ],
    debug: [
      "Log per-term rewards; visualise worst episodes",
      "Export and replay the policy in a second simulator (Sim2Sim) before real hardware",
      "Freeze the observation/action spec in a single shared config file",
    ],
    tools: [{ name: "Isaac Lab (Newton, PhysX, MuJoCo backends)", src: "isaacLab" }],
    sources: ["isaacLab"],
    engineer: {
      title: "Timing (example values — robot dependent)",
      body: [
        "physics dt = 5 ms (200 Hz)",
        "decimation = 4 → policy runs at 50 Hz",
        "num_envs = 4096 parallel environments",
        "Deploy with the SAME decimation-derived policy rate, or the policy sees a different dynamics.",
      ],
    },
  },

  gr00t: {
    stage: "learn",
    title: "Foundation Policy (VLA)",
    tech: "Isaac GR00T N1.x",
    what: "Vision-Language-Action foundation model: camera images + language instruction + robot state → a chunk of future actions. Current open release (N1.7): 3B params, Cosmos-Reason2-2B VLM backbone, flow-matching diffusion-transformer action head.",
    why: "Traditional policy: one task → one model trained from scratch. Foundation model: pre-trained on large, cross-embodiment robot + human data, then post-trained (fine-tuned) on your robot with far fewer demos.",
    whenNeeded: "Language-conditioned, multi-task or vision-heavy manipulation where generalisation matters. Not needed for a single well-defined locomotion skill that RL solves.",
    input: ["Camera image(s)", "Language instruction", "Robot state (proprioception)"],
    output: ["Action chunk [a₀ … a_H]", "Executed partially, then re-planned"],
    bottleneck: [
      "Inference latency of a multi-billion-parameter model on the edge",
      "Embodiment / action-space mismatch with pre-training data",
      "Data quality > data quantity for post-training",
    ],
    debug: [
      "Open-loop eval on held-out demos: predicted vs. recorded actions",
      "Check state/action normalisation statistics per embodiment",
      "Tune execution horizon: how many chunk actions to execute before re-querying",
    ],
    tools: [
      { name: "Isaac GR00T N1.7 (open weights & code)", src: "gr00tRepo" },
      { name: "GR00T platform overview", src: "gr00tPage" },
    ],
    sources: ["gr00tRepo", "gr00tBlog", "gr00tPage"],
    diagram:
      "  Camera image ─┐\n" +
      "  Language     ─┼──►  GR00T (VLM + action head)  ──►  Action chunk\n" +
      "  Robot state  ─┘                                     [a₀ a₁ … a_H]",
    engineerWidget: "chunk",
  },

  arena: {
    stage: "eval",
    title: "Evaluation",
    tech: "NVIDIA Isaac Lab-Arena",
    what: "Open-source framework built on Isaac Lab for scalable policy evaluation in simulation.",
    why: "Real-robot evaluation is slow and noisy. Large, repeatable sim benchmarks catch regressions before hardware time is spent.",
    whenNeeded: "Every training iteration — treat it like CI for robot policies.",
    input: ["Trained policy / checkpoint", "Task + scene variations", "Success metrics"],
    output: ["Success rate, failure taxonomy, per-variation metrics"],
    bottleneck: [
      "Sim success ≠ real success (optimistic sim)",
      "Too few trials → noisy success-rate estimates",
    ],
    debug: [
      "Report confidence intervals, not a single success number",
      "Correlate sim vs. real success on a small fixed real-world set",
      "Bucket failures: perception / grasp / placement / timeout",
    ],
    tools: [{ name: "Isaac Lab-Arena", src: "isaacLab" }],
    sources: ["isaacLab", "gr00tBlog"],
    engineer: {
      title: "Sample-size intuition (math, not a product spec)",
      body: [
        "95% CI half-width ≈ 1.96·√(p(1−p)/n)",
        "p = 0.8, n = 50 → ±11%   ·   n = 200 → ±5.5%",
        "Two policies 5% apart need hundreds of trials to separate reliably.",
      ],
    },
  },

  tensorrt: {
    stage: "deploy",
    title: "Model Optimisation",
    tech: "ONNX → TensorRT",
    what: "Export the trained network to ONNX and compile an optimised TensorRT engine (layer fusion, FP16 / FP8 / INT8 / FP4 precision where supported).",
    why: "PyTorch eager inference is rarely fast enough on an edge device; latency directly limits policy frequency.",
    whenNeeded: "Before measuring real latency on the robot computer. The GR00T repo ships an ONNX/TensorRT export pipeline.",
    input: ["Trained checkpoint (PyTorch)", "Representative calibration data (for INT8)"],
    output: ["TensorRT engine for the target GPU", "Latency / accuracy report"],
    bottleneck: [
      "Unsupported ops or dynamic shapes during ONNX export",
      "Accuracy drop after quantisation",
      "Engine built on one GPU/TensorRT version won't load on another",
    ],
    debug: [
      "Compare PyTorch vs. TensorRT outputs on the same inputs (max abs error)",
      "Profile per-layer latency (trtexec / Nsight Systems)",
      "Build engines on the target device (e.g. on Jetson)",
    ],
    tools: [
      { name: "TensorRT", src: "tensorrt" },
      { name: "GR00T ONNX/TensorRT export", src: "gr00tRepo" },
    ],
    sources: ["tensorrt", "tensorrtDocs", "gr00tRepo"],
    engineer: {
      title: "Optimisation ladder",
      body: [
        "PyTorch (FP32) → ONNX → TensorRT FP16 → TensorRT INT8 / FP8 / FP4",
        "Validate accuracy at every rung — faster is useless if success rate drops.",
        "Speed-ups vary by model and hardware: measure, don't assume.",
      ],
    },
  },

  thor: {
    stage: "deploy",
    title: "Edge Compute",
    tech: "NVIDIA Jetson Thor",
    what: "On-robot computer for physical AI. Jetson AGX Thor (T5000): 2560-core Blackwell GPU, up to 2070 TFLOPS (FP4, sparse), 128 GB LPDDR5X, 40–130 W; Jetson T4000: 1200 TFLOPS, 64 GB, 40–70 W (per NVIDIA spec page).",
    why: "Humanoids must run perception, VLA and control locally — cloud round-trips add latency and fail without network.",
    whenNeeded: "When a multi-billion-parameter VLA plus perception must run on-board in real time.",
    input: ["TensorRT engine", "Camera streams", "ROS 2 graph"],
    output: ["Real-time actions at target frequency"],
    bottleneck: [
      "Shared GPU between perception, VLA and other nodes",
      "Power mode / thermal throttling changes latency",
      "CPU ↔ GPU memory copies",
    ],
    debug: [
      "Fix the power mode and clocks before benchmarking",
      "Measure p50 / p99 latency, not the mean",
      "Profile the whole pipeline with Nsight Systems",
    ],
    tools: [{ name: "Jetson AGX Thor", src: "thor" }],
    sources: ["thor", "gr00tRepo"],
  },

  isaacros: {
    stage: "deploy",
    title: "Middleware",
    tech: "Isaac ROS / ROS 2",
    what: "GPU-accelerated ROS 2 packages (perception, image processing, etc.) with zero-copy GPU transport between nodes.",
    why: "Robots are integrated through ROS 2; copying images through the CPU between nodes wastes the latency budget.",
    whenNeeded: "When camera → model → controller data flows through a ROS 2 graph on Jetson.",
    input: ["Sensor drivers", "Policy node (TensorRT)", "Robot SDK / controller"],
    output: ["Timed, synchronised topics: images, state, action commands"],
    bottleneck: [
      "Serialisation / copies of large image messages",
      "QoS / executor configuration causing jitter",
      "Unsynchronised sensor timestamps",
    ],
    debug: [
      "ros2 topic hz / delay on every hop",
      "Use header timestamps end-to-end; log sensor-to-action latency",
      "Prefer intra-process / zero-copy transport for images",
    ],
    tools: [
      { name: "Isaac ROS", src: "isaacRos" },
      { name: "Zero-copy: NITROS → rosidl::Buffer", src: "isaacRosBuffer" },
      { name: "ROS 2", src: "ros2" },
    ],
    sources: ["isaacRos", "isaacRosDocs", "isaacRosBuffer", "ros2"],
  },

  robot: {
    stage: "robot",
    title: "Real Robot",
    tech: "e.g. Unitree G1 humanoid",
    what: "The physical robot: whole-body controller, joint PD / actuator control, safety layer.",
    why: "The only place where the task actually counts. Sim success must be confirmed here.",
    whenNeeded: "Final validation — and as the source of real data that closes the loop back to training.",
    input: ["Action commands (joint targets / EEF targets)", "Safety limits"],
    output: ["Task success / failure", "Real logs for the next data iteration"],
    bottleneck: [
      "Sim2Real gap: dynamics, latency, sensor noise",
      "Hardware time and safety supervision",
    ],
    debug: [
      "Start in a harness / with reduced gains and torque limits",
      "Log everything the policy sees and outputs; replay offline",
      "Use the Sim2Real Debugger tab for symptom → cause analysis",
    ],
    tools: [],
    sources: ["g1"],
    engineer: {
      title: "Control hierarchy (typical, example rates)",
      body: [
        "High-level policy / VLA: 10–30 Hz",
        "Whole-body / low-level policy: 50–100 Hz",
        "Joint PD / actuator loop: 500–1000 Hz",
      ],
    },
  },
};

/*
 * Tasks: each node is marked core / optional / skip for the selected task, with a task-specific note.
 * These are the author's engineering recommendations, not NVIDIA guidance.
 */
PAWE.TASKS = [
  {
    id: "g1-grasp",
    label: "Unitree G1: see an object on the table and grasp it",
    nodes: {
      task: ["core", "Bounded object set (e.g. 10 household items), table height fixed, success = object lifted ≥ 5 cm for 2 s."],
      teleop: ["core", "Collect a few hundred bimanual / single-arm demos with VR teleop; vary object pose and lighting."],
      cosmos: ["optional", "Useful if the real deployment table/lighting differs from where demos were collected."],
      mimic: ["core", "Multiply demos across object poses in sim — grasping is object-pose sensitive."],
      isaacsim: ["core", "Digital twin of the table scene + head/wrist cameras matching real intrinsics."],
      isaaclab: ["optional", "Needed for a locomotion / balance controller; the grasp itself is learned by imitation."],
      gr00t: ["core", "Post-train GR00T on the demos: vision + language ('pick up the red cup') → arm/hand action chunks."],
      arena: ["core", "Evaluate across object sets and poses before booking robot time."],
      tensorrt: ["core", "Export to TensorRT to hit the VLA rate on-board."],
      thor: ["core", "Runs VLA + perception on the robot."],
      isaacros: ["core", "Camera → policy → controller graph."],
      robot: ["core", "Whole-body controller keeps balance while arms follow VLA targets."],
    },
  },
  {
    id: "shelf-pick",
    label: "Humanoid picks boxes from a shelf (5 h of teleop data)",
    nodes: {
      task: ["core", "Define shelf heights, box sizes/weights and what counts as a successful place."],
      teleop: ["core", "5 h of existing teleop demos — audit quality and timestamp alignment before anything else."],
      cosmos: ["optional", "Augment visual variety (box textures, warehouse lighting)."],
      mimic: ["core", "Expand demos to new box positions / shelf levels."],
      isaacsim: ["core", "Shelf + box assets with realistic mass and friction."],
      isaaclab: ["optional", "Train / tune whole-body balance under payload."],
      gr00t: ["core", "Post-train on real + synthetic demos."],
      arena: ["core", "Benchmark per shelf level and box weight."],
      tensorrt: ["core", "Required for on-board real-time inference."],
      thor: ["core", "On-board compute."],
      isaacros: ["core", "Integration with robot SDK and cameras."],
      robot: ["core", "Payload changes dynamics — validate balance with the heaviest box first."],
    },
  },
  {
    id: "loco",
    label: "Humanoid walks over rough terrain (no manipulation)",
    nodes: {
      task: ["core", "Terrain set, velocity command range, fall = failure."],
      teleop: ["skip", "Locomotion is usually learned with RL from rewards; demos (e.g. mocap) are optional style priors."],
      cosmos: ["skip", "Blind proprioceptive locomotion doesn't need visual augmentation."],
      mimic: ["skip", "Designed for manipulation trajectories."],
      isaacsim: ["core", "Robot asset quality (joint order, limits, masses) is critical."],
      isaaclab: ["core", "Massively parallel RL with terrain curriculum and domain randomisation."],
      gr00t: ["skip", "A small MLP/RNN policy trained with RL is typical; a VLA is unnecessary for a single skill."],
      arena: ["optional", "Useful for systematic evaluation across terrains."],
      tensorrt: ["optional", "Small MLP may already meet the budget on CPU; ONNX Runtime is often sufficient."],
      thor: ["optional", "Needed if perception (height map) is added."],
      isaacros: ["core", "State estimation + command interface."],
      robot: ["core", "See Sim2Real Debugger — this is where most time goes."],
    },
  },
];
