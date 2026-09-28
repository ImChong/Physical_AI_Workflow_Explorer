/*
 * Chinese content overrides. Keys mirror workflow-data.js / sim2real-data.js;
 * any field missing here falls back to English. Product names and code-like
 * diagrams are intentionally kept in English.
 */
window.PAWE = window.PAWE || {};

PAWE.ZH = {
  stages: {
    data: "数据",
    sim: "仿真",
    learn: "学习",
    eval: "评估",
    deploy: "部署",
    robot: "机器人",
  },

  nodes: {
    task: {
      title: "客户任务",
      tech: "任务与成功标准定义",
      what: "对机器人要做什么、在什么场景、如何衡量成功的精确描述。",
      why: "后续所有选择 — 数据量、仿真精度、模型类型、算力预算 — 都取决于任务。定义模糊的任务会产出无法评估的策略。",
      whenNeeded: "始终需要。如果你写不出成功指标，就还没准备好采集数据。",
      input: ["业务目标", "机器人本体（例如 Unitree G1）", "机载传感器与算力"],
      output: ["任务规格：物体、场景变化、成功标准", "延迟 / 频率要求", "安全约束"],
      bottleneck: ["成功指标无法在仿真和真机上用同一种方式测量", "范围蔓延：“抓任何东西”而不是有限的物体集合"],
      debug: ["先写评估协议：试验次数、物体集合、初始状态分布", "确认策略需要的每个传感器在真机上都存在"],
      engineer: {
        title: "规格检查清单",
        body: [
          "本体：自由度、动作空间（关节 / 末端执行器）、控制接口",
          "观测：相机（数量、分辨率、帧率）、本体感知、语言指令",
          "控制：所需策略频率、最大端到端延迟",
          "评估：目标成功率、试验次数、随机化的初始状态",
        ],
      },
    },

    teleop: {
      title: "数据采集 / 遥操作",
      what: "通过遥操作机器人（真机或仿真）记录的人类示教，例如使用 VR 头显或 spacemouse。",
      why: "模仿学习和 VLA 后训练都需要任务相关的示教数据。真实示教包含仿真可能缺失的真实物理和传感器噪声。",
      whenNeeded: "当任务难以写成奖励函数（灵巧操作、多步骤任务），并且希望策略模仿人类策略时。",
      input: ["遥操作设备（VR 头显 / spacemouse / 外骨骼）", "机器人或仿真场景", "任务规格"],
      output: ["Episode：同步的图像 + 机器人状态 + 动作", "标准格式的数据集（例如 LeRobot 格式）"],
      bottleneck: ["人力时间：示教采集慢且贵", "操作员策略不一致 → 多模态、噪声大的数据", "相机与关节状态的时间戳不对齐"],
      debug: [
        "开环回放记录的动作：机器人能否复现示教？",
        "画出相机与关节状态的时间戳，检查漂移和丢帧",
        "确认动作语义（绝对 / 增量、关节 / 末端）与模型配置一致",
      ],
      engineer: {
        title: "参考数据点",
        body: [
          "NVIDIA 的 GR00T 端到端示例为一个抓取放置任务采集了 400 条轨迹，并以 LeRobot 格式进行后训练（来源：GR00T 端到端博客）。",
          "以固定控制频率录制，并把频率写入数据集元数据 — 模型的 action horizon 以“步”而不是“秒”定义。",
        ],
      },
    },

    cosmos: {
      title: "合成世界数据",
      tech: "NVIDIA Cosmos（世界基础模型）",
      what: "生成或变换视频 / 世界状态的世界基础模型 — 例如 Cosmos Predict（预测未来视频）、Cosmos Transfer（重新渲染外观）、Cosmos Reason（物理推理 VLM）。",
      why: "真实示教只覆盖少量光照、纹理和背景。生成式增强可以在不增加遥操作时长的情况下成倍增加视觉多样性。",
      whenNeeded: "当策略依赖视觉，并在视觉分布变化（新桌面、光照、背景）下失败时 — 而不是在失败源于动力学时。",
      input: ["种子视频 / 仿真渲染", "文本提示或控制信号（深度、分割）"],
      output: ["视觉多样的视频 / 图像", "GR00T-Dreams：从一张图像 + 语言提示生成合成轨迹"],
      bottleneck: [
        "生成的画面可能违反物理或机器人运动学",
        "动作标签不是免费的：Dreams 类流程需要从生成视频中推断动作（例如逆动力学模型）",
        "大型生成模型的算力成本",
      ],
      debug: ["训练前过滤生成片段（例如用推理模型筛选）", "消融实验：在同一评估集上对比有 / 无合成数据的训练结果"],
      tools: ["Cosmos Predict / Transfer / Reason", "GR00T-Dreams 蓝图"],
    },

    mimic: {
      title: "合成动作数据",
      what: "一个从少量人类示教生成大量合成操作轨迹的蓝图（blueprint）。",
      why: "通过把以物体为中心的子任务重定向到新的物体位姿，在仿真中把几十条示教扩展到数千条。",
      whenNeeded: "当你有少量高质量示教，但需要覆盖大量初始物体位姿 / 布局时。",
      input: ["少量人类示教（已标注子任务）", "仿真场景（Isaac Sim / Isaac Lab）"],
      output: ["带动作标签的大规模合成轨迹数据集"],
      bottleneck: ["物理上失败的生成轨迹必须过滤（成功判定）", "子任务切分质量决定生成质量"],
      debug: ["按子任务统计生成成功率", "随机抽样目视检查生成的 episode"],
      tools: ["GR00T-Mimic 蓝图"],
      engineer: {
        title: "官方报告的规模",
        body: ["NVIDIA 报告用 GR00T-Mimic 在 11 小时内生成了 78 万条合成轨迹（约相当于 6.5K 小时的示教数据）（来源：NVIDIA 新闻稿 / 博客）。"],
      },
    },

    isaacsim: {
      title: "仿真",
      what: "基于 Omniverse/OpenUSD、带 RTX 传感器渲染的物理机器人仿真器。",
      why: "无需冒损坏昂贵硬件的风险即可训练和验证；可按需复现罕见或危险的情况。",
      whenNeeded: "只要需要可扩展的数据、安全的测试或可控的随机化 — 也就是几乎每次上真机之前。",
      input: ["机器人 USD（由 URDF/MJCF 转换）", "场景 + 物体资产", "传感器配置（相机、IMU）"],
      output: ["仿真环境", "渲染的传感器数据 + 真值"],
      bottleneck: ["URDF → USD 转换后关节映射 / 顺序错误", "不真实的接触与摩擦", "传感器不匹配：内参、延迟、噪声"],
      debug: ["逐个驱动关节，与真机对比方向和限位", "对比相机内参 / 视场角与真实传感器标定", "跌落测试和推力测试：与真机日志对比轨迹"],
      engineer: {
        title: "资产检查（示例）",
        body: [
          "关节名称与顺序：仿真 ↔ SDK ↔ 策略配置必须一致",
          "关节驱动：stiffness / damping 是作为 PD 增益还是力矩限制？",
          "质量 / 惯量：来自 CAD 还是 URDF 默认值",
          "物理步长与求解器迭代次数（示例：足式机器人常用 200 Hz 物理频率）",
        ],
      },
    },

    isaaclab: {
      title: "机器人学习",
      what: "开源、GPU 加速的机器人学习框架（强化学习与模仿学习），支持 perception in the loop 和多种物理后端。",
      why: "数千个并行环境让强化学习和大规模数据生成在单张 GPU 上变得可行。",
      whenNeeded: "用 RL 训练行走 / 全身控制、用示教做 IL，或为基础模型训练生成仿真 rollout。",
      input: ["仿真环境 + 任务定义（观测、动作、奖励 / 示教）", "Domain randomization 配置"],
      output: ["训练好的策略（RL / IL）", "仿真 rollout / 数据集"],
      bottleneck: ["RL 中的奖励投机 / 不自然的步态", "过拟合仿真物理（Sim2Real gap）", "训练与部署的观测不一致"],
      debug: ["记录每一项奖励；可视化最差的 episode", "上真机前先把策略导出到另一个仿真器回放（Sim2Sim）", "把观测 / 动作规格固定在一个共享配置文件里"],
      tools: ["Isaac Lab（Newton、PhysX、MuJoCo 后端）"],
      engineer: {
        title: "时序（示例值 — 取决于机器人）",
        body: [
          "物理步长 dt = 5 ms（200 Hz）",
          "decimation = 4 → 策略以 50 Hz 运行",
          "num_envs = 4096 个并行环境",
          "部署时必须使用由 decimation 推出的相同策略频率，否则策略面对的是另一套动力学。",
        ],
      },
    },

    gr00t: {
      title: "基础策略模型（VLA）",
      what: "视觉-语言-动作（VLA）基础模型：相机图像 + 语言指令 + 机器人状态 → 一段未来动作（action chunk）。当前开源版本（N1.7）：3B 参数，Cosmos-Reason2-2B VLM 骨干，flow-matching 扩散 Transformer 动作头。",
      why: "传统策略：一个任务从零训练一个模型。基础模型：先在大规模跨本体的机器人 + 人类数据上预训练，再用少得多的示教在你的机器人上后训练（微调）。",
      whenNeeded: "需要泛化能力的语言条件、多任务或以视觉为主的操作任务。对于 RL 就能解决的单一行走技能则不需要。",
      input: ["相机图像", "语言指令", "机器人状态（本体感知）"],
      output: ["Action chunk [a₀ … a_H]", "部分执行后重新规划"],
      bottleneck: ["数十亿参数模型在边缘端的推理延迟", "本体 / 动作空间与预训练数据不匹配", "后训练中数据质量比数量更重要"],
      debug: [
        "在保留示教上做开环评估：预测动作 vs. 记录动作",
        "按本体检查状态 / 动作的归一化统计量",
        "调节 execution horizon：重新推理前执行多少个 chunk 动作",
      ],
      tools: ["Isaac GR00T N1.7（开源权重与代码）", "GR00T 平台概览"],
    },

    arena: {
      title: "评估",
      what: "基于 Isaac Lab 构建的开源框架，用于在仿真中进行可扩展的策略评估。",
      why: "真机评估慢且噪声大。大规模、可复现的仿真基准能在占用硬件时间前发现退化。",
      whenNeeded: "每一轮训练迭代 — 把它当作机器人策略的 CI。",
      input: ["训练好的策略 / checkpoint", "任务 + 场景变化", "成功指标"],
      output: ["成功率、失败分类、按变化维度的指标"],
      bottleneck: ["仿真成功 ≠ 真机成功（仿真偏乐观）", "试验次数太少 → 成功率估计噪声大"],
      debug: ["报告置信区间，而不是单一成功率", "在一小组固定的真实场景上对比仿真与真机成功率的相关性", "失败分桶：感知 / 抓取 / 放置 / 超时"],
      engineer: {
        title: "样本量直觉（数学，不是产品规格）",
        body: ["95% 置信区间半宽 ≈ 1.96·√(p(1−p)/n)", "p = 0.8，n = 50 → ±11%   ·   n = 200 → ±5.5%", "两个相差 5% 的策略需要数百次试验才能可靠区分。"],
      },
    },

    tensorrt: {
      title: "模型优化",
      what: "把训练好的网络导出为 ONNX，并编译成优化后的 TensorRT engine（层融合，以及在支持时使用 FP16 / FP8 / INT8 / FP4 精度）。",
      why: "PyTorch eager 推理在边缘设备上很少足够快；延迟直接限制策略频率。",
      whenNeeded: "在机器人计算机上测真实延迟之前。GR00T 仓库自带 ONNX/TensorRT 导出流程。",
      input: ["训练好的 checkpoint（PyTorch）", "代表性校准数据（用于 INT8）"],
      output: ["面向目标 GPU 的 TensorRT engine", "延迟 / 精度报告"],
      bottleneck: ["ONNX 导出时遇到不支持的算子或动态 shape", "量化后精度下降", "在一种 GPU/TensorRT 版本上构建的 engine 无法在另一种上加载"],
      debug: ["在相同输入上对比 PyTorch 与 TensorRT 输出（最大绝对误差）", "逐层分析延迟（trtexec / Nsight Systems）", "在目标设备上构建 engine（例如在 Jetson 上）"],
      tools: ["TensorRT", "GR00T ONNX/TensorRT 导出"],
      engineer: {
        title: "优化阶梯",
        body: [
          "PyTorch (FP32) → ONNX → TensorRT FP16 → TensorRT INT8 / FP8 / FP4",
          "每一级都要验证精度 — 如果成功率下降，再快也没用。",
          "加速比因模型和硬件而异：要实测，不要假设。",
        ],
      },
    },

    thor: {
      title: "边缘计算",
      what: "面向物理 AI 的机载计算机。Jetson AGX Thor（T5000）：2560 核 Blackwell GPU，最高 2070 TFLOPS（FP4，稀疏），128 GB LPDDR5X，40–130 W；Jetson T4000：1200 TFLOPS，64 GB，40–70 W（据 NVIDIA 规格页）。",
      why: "人形机器人必须在本地运行感知、VLA 和控制 — 云端往返会增加延迟，而且断网就失效。",
      whenNeeded: "当数十亿参数的 VLA 加上感知必须在机载端实时运行时。",
      input: ["TensorRT engine", "相机数据流", "ROS 2 计算图"],
      output: ["以目标频率实时输出的动作"],
      bottleneck: ["感知、VLA 和其他节点共享 GPU", "功耗模式 / 过热降频会改变延迟", "CPU ↔ GPU 内存拷贝"],
      debug: ["基准测试前固定功耗模式和频率", "测量 p50 / p99 延迟，而不是平均值", "用 Nsight Systems 分析整个流水线"],
    },

    isaacros: {
      title: "中间件",
      what: "GPU 加速的 ROS 2 软件包（感知、图像处理等），支持节点间 GPU 零拷贝传输。",
      why: "机器人通过 ROS 2 集成；图像在节点间经 CPU 拷贝会浪费延迟预算。",
      whenNeeded: "当相机 → 模型 → 控制器的数据在 Jetson 上通过 ROS 2 计算图流转时。",
      input: ["传感器驱动", "策略节点（TensorRT）", "机器人 SDK / 控制器"],
      output: ["带时间戳、已同步的 topic：图像、状态、动作指令"],
      bottleneck: ["大图像消息的序列化 / 拷贝", "QoS / executor 配置导致抖动", "传感器时间戳不同步"],
      debug: ["对每一跳执行 ros2 topic hz / delay", "端到端使用 header 时间戳；记录传感器到动作的延迟", "图像优先使用进程内 / 零拷贝传输"],
      tools: ["Isaac ROS", "零拷贝：NITROS → rosidl::Buffer", "ROS 2"],
    },

    robot: {
      title: "真实机器人",
      tech: "例如 Unitree G1 人形机器人",
      what: "物理机器人：全身控制器、关节 PD / 执行器控制、安全层。",
      why: "任务真正算数的唯一地方。仿真中的成功必须在这里确认。",
      whenNeeded: "最终验证 — 同时也是真实数据的来源，把闭环接回训练。",
      input: ["动作指令（关节目标 / 末端目标）", "安全限制"],
      output: ["任务成功 / 失败", "用于下一轮数据迭代的真机日志"],
      bottleneck: ["Sim2Real gap：动力学、延迟、传感器噪声", "硬件时间与安全监护"],
      debug: ["先在吊架上 / 用较低增益和力矩限制启动", "记录策略看到和输出的一切；离线回放", "使用“Sim2Real 调试”页做现象 → 原因分析"],
      engineer: {
        title: "控制层级（典型，示例频率）",
        body: ["高层策略 / VLA：10–30 Hz", "全身 / 底层策略：50–100 Hz", "关节 PD / 执行器回路：500–1000 Hz"],
      },
    },
  },

  tasks: {
    "g1-grasp": {
      label: "Unitree G1：看见桌上的物体并完成抓取",
      notes: {
        task: "限定物体集合（例如 10 种日常物品），桌面高度固定，成功 = 物体被抬起 ≥ 5 cm 并保持 2 s。",
        teleop: "用 VR 遥操作采集几百条双臂 / 单臂示教；变化物体位姿与光照。",
        cosmos: "当真实部署的桌面 / 光照与示教采集环境不同时有用。",
        mimic: "在仿真中把示教扩展到各种物体位姿 — 抓取对物体位姿很敏感。",
        isaacsim: "桌面场景的数字孪生 + 与真实内参一致的头部 / 腕部相机。",
        isaaclab: "行走 / 平衡控制器需要；抓取本身通过模仿学习获得。",
        gr00t: "在示教上后训练 GR00T：视觉 + 语言（“拿起红色杯子”）→ 手臂 / 手部 action chunk。",
        arena: "在占用机器人时间前，按物体集合和位姿进行评估。",
        tensorrt: "导出到 TensorRT，以在机载端达到 VLA 频率。",
        thor: "在机器人上运行 VLA + 感知。",
        isaacros: "相机 → 策略 → 控制器的计算图。",
        robot: "全身控制器保持平衡，手臂跟随 VLA 目标。",
      },
    },
    "shelf-pick": {
      label: "人形机器人从货架取箱子（已有 5 小时遥操作数据）",
      notes: {
        task: "定义货架高度、箱子尺寸 / 重量，以及什么算成功放置。",
        teleop: "已有 5 小时遥操作示教 — 先审查数据质量和时间戳对齐，再做其他事。",
        cosmos: "增强视觉多样性（箱子纹理、仓库光照）。",
        mimic: "把示教扩展到新的箱子位置 / 货架层。",
        isaacsim: "质量与摩擦真实的货架 + 箱子资产。",
        isaaclab: "训练 / 调优负载下的全身平衡。",
        gr00t: "在真实 + 合成示教上后训练。",
        arena: "按货架层与箱子重量做基准评估。",
        tensorrt: "机载实时推理所必需。",
        thor: "机载算力。",
        isaacros: "与机器人 SDK 和相机集成。",
        robot: "负载会改变动力学 — 先用最重的箱子验证平衡。",
      },
    },
    loco: {
      label: "人形机器人在崎岖地形上行走（无操作任务）",
      notes: {
        task: "地形集合、速度指令范围，摔倒 = 失败。",
        teleop: "行走通常用 RL 从奖励中学习；示教（例如动捕）只是可选的风格先验。",
        cosmos: "纯本体感知的行走不需要视觉增强。",
        mimic: "它是为操作轨迹设计的。",
        isaacsim: "机器人资产质量（关节顺序、限位、质量）至关重要。",
        isaaclab: "大规模并行 RL + 地形课程学习 + domain randomization。",
        gr00t: "通常用 RL 训练一个小型 MLP/RNN 策略；单一技能不需要 VLA。",
        arena: "适合在多种地形上做系统化评估。",
        tensorrt: "小型 MLP 可能在 CPU 上就能满足预算；ONNX Runtime 通常就够了。",
        thor: "加入感知（高度图）时才需要。",
        isaacros: "状态估计 + 指令接口。",
        robot: "见“Sim2Real 调试” — 大部分时间都花在这里。",
      },
    },
  },

  symptoms: {
    falls: { label: "机器人一上来就摔倒", hint: "策略接管后第一秒内。" },
    oscillates: { label: "机器人振荡 / 抖动", hint: "一个或多个关节高频抖动或出现极限环。" },
    delayed: { label: "动作延迟 / 迟钝", hint: "机器人对指令或扰动反应慢。" },
    wrongDir: { label: "关节方向错误", hint: "某个肢体的运动方向与仿真相反，或动错了肢体。" },
    unstableLater: { label: "运行几秒后策略变得不稳定", hint: "一开始正常，随后退化或漂移。" },
  },

  causes: {
    jointOrder: {
      title: "关节顺序不一致",
      explain: "仿真器和机器人 SDK 对关节的枚举顺序不同（例如 USD 解析的广度优先 vs. 深度优先、左右分组）。于是策略读的是关节 i，控制的却是关节 j。",
      check: ["把仿真和 SDK 的关节名列表并排打印", "按索引只控制一个关节，观察实际动的是哪个"],
      fix: ["建立基于名称的仿真 ↔ SDK 显式索引映射，并同时应用于观测和动作"],
      linkLabel: "关节顺序检查工具",
    },
    jointSign: {
      title: "关节轴方向 / 零位偏移",
      explain: "URDF 中定义为 +Y 的关节轴在固件中可能是 −Y，或者编码器零位与 URDF 零位不同。",
      check: ["手动 / 小指令移动每个关节，对比两边的符号", "对比机器人标定零位与 URDF 零位"],
      fix: ["在部署适配层中逐关节加符号和偏移 — 不要为此重新训练"],
    },
    defaultPose: {
      title: "默认姿态 / 动作偏移不一致",
      explain: "策略通常输出围绕默认关节姿态的偏移：q_target = q_default + scale·a。真机上 q_default 不同，所有目标都会被平移。",
      check: ["对比训练配置和部署配置中的 q_default"],
      fix: ["从同一个导出的配置文件加载 q_default、动作缩放和关节顺序"],
    },
    obsFrame: {
      title: "观测坐标系 / 约定不一致",
      explain: "IMU 四元数顺序（wxyz vs. xyzw）、projected gravity 的坐标系，或角速度在世界系 vs. 机体系，在仿真和 SDK 之间不一致。",
      check: ["让机器人竖直静止：projected gravity 应 ≈ [0, 0, −1]", "向前倾：x 分量的符号应与仿真一致"],
      fix: ["用仿真记录的观测对观测构建函数做单元测试"],
    },
    kpkd: {
      title: "Kp / Kd 不一致",
      explain: "策略是在特定 PD 增益下训练的。真机上增益不同（或 PD 实现 / 频率不同）会改变策略所预期的闭环动力学。",
      check: ["逐关节做阶跃响应测试：对比仿真与真机的上升时间和超调", "确认电机驱动器中 Kp/Kd 的单位（Nm/rad 还是缩放值）"],
      fix: ["对齐增益；训练时随机化 Kp/Kd（例如 ±20%）"],
    },
    policyFreq: {
      title: "策略频率不一致",
      explain: "训练时策略频率 = 物理频率 / decimation（例如 200 Hz / 4 = 50 Hz）。真机上以不同频率运行，会改变每个动作被保持的时长。",
      check: ["记录真机上策略循环的时间戳，画出周期直方图", "检查负载下是否错过 deadline"],
      fix: ["用固定频率定时器运行策略；优化推理直到满足周期"],
    },
    actionScale: {
      title: "动作缩放不一致",
      explain: "训练与部署的动作缩放或裁剪不同，同样的网络输出会产生更大或更小的关节目标。",
      check: ["对比 action_scale / clip 数值；在真机上记录网络原始输出"],
      fix: ["把 scale 和 clip 随模型一起导出；加载时做断言"],
    },
    obsDelay: {
      title: "观测延迟",
      explain: "在真机上，策略看到的是 Δ ms 之前的状态（传感器、总线、传输、推理）。而在仿真中它看到的是当前状态，所以学会了基于最新信息行动。",
      check: ["测量传感器时间戳 → 指令时间戳的延迟", "在仿真中回放真机日志并插入实测的 Δ — 仿真能否复现振荡？"],
      fix: ["降低延迟（见“部署预算”）；训练时随机化延迟"],
    },
    velNoise: {
      title: "关节速度噪声",
      explain: "真实关节速度通常由编码器差分得到；噪声会被 Kd 和策略的速度输入放大。",
      check: ["机器人静止时画出 q̇ — 应接近零"],
      fix: ["训练时加入速度噪声；对 q̇ 做低通滤波（注意引入的延迟）"],
    },
    actuatorDyn: {
      title: "执行器动力学不一致",
      explain: "真实电机有带宽限制、摩擦、回差和力矩-速度曲线。仿真中理想 PD 执行器是瞬时响应的。",
      check: ["逐关节做扫频 / 阶跃测试；与仿真对比 Bode 图或阶跃响应"],
      fix: ["建模执行器（例如 actuator network、直流电机模型），或随机化摩擦 / armature"],
    },
    torqueLimit: {
      title: "力矩 / effort 限制不一致",
      explain: "仿真允许的力矩超过真实电机（或机器人上配置的安全限制）。",
      check: ["在真机上记录指令力矩：是否饱和？"],
      fix: ["在资产中设置真实的 effort limit；在奖励中惩罚力矩"],
    },
    commJitter: {
      title: "通信抖动 / 丢包",
      explain: "DDS / ROS 2 / 以太网的传输时间不稳定；部分周期拿到的是过期或缺失的指令。",
      check: ["ros2 topic hz 和 delay；到达间隔直方图"],
      fix: ["实时内核 / executor、专用网卡、QoS 调优，训练时随机化延迟"],
    },
    actionFilter: {
      title: "真机侧额外的滤波",
      explain: "出于安全在真机侧加的低通滤波或限速器，引入了策略从未见过的相位滞后。",
      check: ["检查真机侧指令链路中的滤波 / 平滑"],
      fix: ["在训练中加入相同的滤波，或去掉它"],
    },
    historyInit: {
      title: "历史缓冲 / 上一动作初始化",
      explain: "带观测历史或上一动作输入的策略，如果真机上缓冲区用 0 初始化、而仿真中是有效状态，行为就会不同。",
      check: ["记录最初几秒的完整观测向量"],
      fix: ["与训练时相同的方式初始化缓冲区（例如重复第一个状态）"],
    },
    stateEstimate: {
      title: "状态估计漂移",
      explain: "真机上机身线速度 / 高度是估计出来的，会漂移；仿真中它们是真值。",
      check: ["用动捕或跑步机参考对比估计器"],
      fix: ["训练时不使用特权状态，或使用相同的估计器 / 噪声模型"],
    },
    thermal: {
      title: "电机发热 / 电池电压下降",
      explain: "电机发热或电池电压下降时力矩能力降低，行为随时间变化。",
      check: ["在失败时同步记录电机温度和母线电压"],
      fix: ["随机化电机强度；在控制器中加入热保护限制"],
    },
    contactFriction: {
      title: "接触 / 摩擦不一致",
      explain: "足底或指尖的摩擦与恢复系数与仿真不同；打滑逐渐累积。",
      check: ["在视频中找足部打滑；如有条件对比接触力"],
      fix: ["随机化摩擦和恢复系数；在多种地形上训练"],
    },
  },
};
