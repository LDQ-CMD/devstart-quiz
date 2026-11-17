/*
 * 起点编程 (DevStart) — 课程与题库数据
 * UMD wrapper: works in browser (window.LEARN_DATA) and Node (module.exports).
 */
(function (root, factory) {
  "use strict";
  var data = factory();
  if (typeof module === "object" && module !== null && typeof module.exports === "object") {
    module.exports = data;
  }
  if (root && typeof root === "object") {
    root.LEARN_DATA = data;
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  return {
    version: 1,
    topics: [
      /* ==================== Python ==================== */
      {
        id: "python",
        title: "Python 编程基础",
        tagline: "从第一行代码开始，学会和计算机对话",
        description: "Python 语法简洁、上手友好，是零基础学编程最常见的起点。这一课带你理解变量、条件循环和函数这三个最核心的概念。",
        level: "入门",
        estimatedMinutes: 25,
        accent: "#2f6fb2",
        icon: "python",
        cards: [
          {
            title: "变量与数据类型",
            summary: "变量是给数据贴上标签，程序的一切计算都从存数据、取数据开始。",
            points: [
              "用「变量名 = 值」把数据存进变量，例如 age = 18",
              "常见类型：整数（int）、小数（float）、字符串（str）、布尔值（bool）",
              "变量名要有意义，只能用字母、数字和下划线，且不能以数字开头",
              "用 type() 可以查看一个数据是什么类型"
            ]
          },
          {
            title: "条件与循环",
            summary: "让程序学会「看情况做事」和「重复做事」，这是所有逻辑的骨架。",
            points: [
              "if / elif / else 让程序按条件选择不同的路",
              "Python 用缩进表示代码块的层级，缩进错了程序会直接报错",
              "for 循环适合「按次数」重复，while 循环适合「按条件」重复",
              "range(3) 会生成 0、1、2，常和 for 搭配使用"
            ]
          },
          {
            title: "函数与代码复用",
            summary: "把一段常用逻辑打包起名字，需要时随时调用，代码才能越写越省力。",
            points: [
              "用 def 定义函数，调用时写 函数名() 即可执行",
              "参数是函数的「入口」，return 是结果的「出口」",
              "没有 return 的函数会默认返回 None",
              "写函数的核心动机：一次定义，处处复用"
            ]
          }
        ],
        questions: [
          {
            id: "python-01",
            question: "在 Python 中运行 print(\"Hello\") 后会发生什么？",
            options: [
              "创建一个名为 Hello 的变量",
              "把 Hello 保存到文件里",
              "在屏幕上输出 Hello",
              "结束程序运行"
            ],
            answerIndex: 2,
            explanation: "print 是 Python 的内置函数，作用是把括号里的内容显示到屏幕上。它不会创建变量，也不会把内容存进文件。",
            difficulty: "基础"
          },
          {
            id: "python-02",
            question: "下面哪一个是合法的 Python 变量名？",
            options: [
              "2name",
              "user-name",
              "class",
              "student_age"
            ],
            answerIndex: 3,
            explanation: "变量名不能以数字开头，不能包含连字符，也不能使用关键字（如 class）。student_age 由字母和下划线组成，完全合法。",
            difficulty: "基础"
          },
          {
            id: "python-03",
            question: "执行 type(3.14) 的返回结果是？",
            options: [
              "<class 'int'>",
              "<class 'float'>",
              "<class 'str'>",
              "<class 'bool'>"
            ],
            answerIndex: 1,
            explanation: "3.14 是带小数点的数字，属于浮点数类型，所以 type() 返回 <class 'float'>。不带小数点的 3 才是 int。",
            difficulty: "进阶"
          },
          {
            id: "python-04",
            question: "len(\"Python\") 的值是多少？",
            options: [
              "5",
              "7",
              "运行报错",
              "6"
            ],
            answerIndex: 3,
            explanation: "\"Python\" 这个字符串一共有 6 个字符，len() 用于统计字符串的长度，所以返回 6。",
            difficulty: "基础"
          },
          {
            id: "python-05",
            question: "Python 用什么方式表示代码块的层级关系（比如 if 里面的代码）？",
            options: [
              "大括号 { }",
              "缩进（行首空格）",
              "分号 ;",
              "圆括号 ( )"
            ],
            answerIndex: 1,
            explanation: "Python 不靠大括号划分代码块，而是靠统一的缩进。同一段代码块必须保持相同的缩进，否则会报 IndentationError。",
            difficulty: "基础"
          },
          {
            id: "python-06",
            question: "下面这段代码会输出几行？\nfor i in range(3):\n    print(i)",
            options: [
              "3 行，分别是 0、1、2",
              "3 行，分别是 1、2、3",
              "2 行",
              "4 行"
            ],
            answerIndex: 0,
            explanation: "range(3) 会依次产生 0、1、2 三个数（不包含 3），所以循环执行 3 次，分别打印出这三个数。",
            difficulty: "基础"
          },
          {
            id: "python-07",
            question: "想往列表 nums 的末尾添加一个元素 5，正确的写法是？",
            options: [
              "nums.append(5)",
              "nums.add(5)",
              "nums.push(5)",
              "nums.insert_last(5)"
            ],
            answerIndex: 0,
            explanation: "Python 列表用 append() 在末尾追加元素。add() 是集合（set）的方法，push() 是其他语言的写法，Python 里并不存在。",
            difficulty: "进阶"
          },
          {
            id: "python-08",
            question: "关于 Python 函数，下面哪个说法是正确的？",
            options: [
              "函数必须至少定义一个参数",
              "函数体里没有 return 时，调用后会返回 None",
              "函数名不能和普通变量同名",
              "一个程序里最多只能定义一个函数"
            ],
            answerIndex: 1,
            explanation: "没有写 return（或只写 return 不带值）的函数，Python 会默认返回 None。函数可以没有参数，也可以在一个程序里定义任意多个。",
            difficulty: "进阶"
          }
        ]
      },

      /* ==================== Docker ==================== */
      {
        id: "docker",
        title: "Docker 容器入门",
        tagline: "把应用连同环境一起打包，走到哪都能跑",
        description: "「在我电脑上明明能跑」是每个开发者都遇过的噩梦。Docker 用镜像和容器把应用与依赖固定下来，让部署变得可预测。",
        level: "入门",
        estimatedMinutes: 30,
        accent: "#1e6fd9",
        icon: "docker",
        cards: [
          {
            title: "镜像与容器",
            summary: "镜像是只读的「安装光盘」，容器是这张光盘运行起来的「活环境」。",
            points: [
              "镜像（Image）是一个打包好的模板，包含代码、依赖和运行环境",
              "容器（Container）是镜像的运行实例，同一个镜像可以同时跑很多容器",
              "镜像分层构建，多个镜像可以共享相同的底层，节省磁盘和下载时间",
              "容器默认是隔离的：有自己的进程空间和文件系统，互不干扰"
            ]
          },
          {
            title: "Dockerfile 与构建",
            summary: "Dockerfile 是一份「搭环境的菜谱」，照着它一步步就能做出标准镜像。",
            points: [
              "Dockerfile 是纯文本文件，逐行描述从基础镜像到装依赖、拷代码的过程",
              "docker build -t 名字 . 会按 Dockerfile 构建镜像，末尾的 . 表示用当前目录作为构建上下文",
              "docker run 基于镜像创建并启动容器；docker ps 查看正在运行的容器",
              "常用基础镜像（如 python:3.12）来自 Docker Hub，可以直接拉取复用"
            ]
          },
          {
            title: "容器 vs 虚拟机",
            summary: "同样是「隔离」，容器和虚拟机的实现思路完全不同，各有各的适用场景。",
            points: [
              "虚拟机虚拟出一整套操作系统，笨重但隔离更彻底",
              "容器共享宿主机的内核，只隔离应用层，因此更轻量、启动更快",
              "一台机器上通常能跑几十个容器，但很难同时跑几十台虚拟机",
              "容器里产生的数据默认随容器删除而丢失，需要用数据卷（Volume）持久保存"
            ]
          }
        ],
        questions: [
          {
            id: "docker-01",
            question: "关于「镜像」和「容器」的关系，下面说法正确的是？",
            options: [
              "镜像运行起来的实例就是容器",
              "容器是创建镜像的模板",
              "两者是完全无关的概念",
              "一个镜像只能被运行一次"
            ],
            answerIndex: 0,
            explanation: "镜像是静态的打包模板，容器是镜像运行起来的实例。类比来说：镜像是安装光盘，容器是装好正在运行的系统。同一个镜像可以同时运行多个容器。",
            difficulty: "基础"
          },
          {
            id: "docker-02",
            question: "Dockerfile 的作用是什么？",
            options: [
              "存储容器运行时产生的数据",
              "描述如何一步步构建出一个镜像",
              "管理远程镜像仓库的登录账号",
              "监控容器占用的内存大小"
            ],
            answerIndex: 1,
            explanation: "Dockerfile 是一份文本「菜谱」，逐行写清楚从哪个基础镜像开始、装什么依赖、拷什么文件，docker build 会照着它构建出镜像。",
            difficulty: "基础"
          },
          {
            id: "docker-03",
            question: "容器最能解决的痛点是下面哪一个？",
            options: [
              "让程序的运行速度提升上百倍",
              "可以完全代替操作系统",
              "把应用和依赖打包成统一环境，避免「在我电脑上能跑」",
              "自带杀毒和防火墙功能"
            ],
            answerIndex: 2,
            explanation: "容器把代码、依赖、系统库一起打包，无论在谁的电脑、哪台服务器上运行，环境都完全一致，从根上解决环境不一致的问题。",
            difficulty: "基础"
          },
          {
            id: "docker-04",
            question: "想查看当前正在运行的容器，应该使用哪条命令？",
            options: [
              "docker ps",
              "docker images",
              "docker run",
              "docker logs"
            ],
            answerIndex: 0,
            explanation: "docker ps 列出正在运行的容器（加 -a 可看到已停止的）；docker images 看镜像，docker run 启动容器，docker logs 看日志。",
            difficulty: "基础"
          },
          {
            id: "docker-05",
            question: "执行 docker build -t myapp . 时，命令末尾的「.」表示什么？",
            options: [
              "构建出来的镜像名字叫「.」",
              "使用当前目录作为构建上下文（在这里找 Dockerfile 和文件）",
              "让镜像在后台运行",
              "只构建 Dockerfile 的第一层"
            ],
            answerIndex: 1,
            explanation: "末尾的「.」指定构建上下文为当前目录，Docker 会从这里找 Dockerfile 以及 COPY 等指令要用的文件。镜像名字由 -t myapp 指定。",
            difficulty: "进阶"
          },
          {
            id: "docker-06",
            question: "docker run 这条命令的主要作用是？",
            options: [
              "基于镜像创建并启动一个容器",
              "删除本地的无用镜像",
              "把镜像上传到远程仓库",
              "查看容器的输出日志"
            ],
            answerIndex: 0,
            explanation: "docker run 会基于指定镜像创建一个新的容器并启动它。上传镜像用 docker push，看日志用 docker logs。",
            difficulty: "基础"
          },
          {
            id: "docker-07",
            question: "关于容器与虚拟机的区别，下面哪个说法是正确的？",
            options: [
              "容器需要在内部安装一套完整的客户操作系统",
              "容器共享宿主机内核，因此更轻量、启动更快",
              "虚拟机比容器更轻量，启动只需几毫秒",
              "容器默认无法访问任何网络"
            ],
            answerIndex: 1,
            explanation: "虚拟机要跑一整个客户操作系统，而容器只隔离应用层、共享宿主机内核，所以更轻、启动更快，一台机器能同时跑大量容器。容器网络是可以正常配置和访问的。",
            difficulty: "进阶"
          },
          {
            id: "docker-08",
            question: "容器被删除后，容器里产生的数据默认会怎样？",
            options: [
              "自动上传到云端备份",
              "永久保存在镜像里",
              "随容器一起丢失，需要用数据卷（Volume）来持久化",
              "自动复制到其他所有容器"
            ],
            answerIndex: 2,
            explanation: "容器的写入层是临时的，容器删除数据就没了。要持久保存数据，应该把数据卷（Volume）或宿主机目录挂载进容器。",
            difficulty: "进阶"
          }
        ]
      },

      /* ==================== Kubernetes ==================== */
      {
        id: "k8s",
        title: "Kubernetes 入门",
        tagline: "让几十台机器像一台一样听你指挥",
        description: "当容器多到人管不过来，就需要 Kubernetes（K8s）来自动编排：扩缩容、故障自愈、滚动更新都交给集群自己完成。",
        level: "入门",
        estimatedMinutes: 35,
        accent: "#5a5fd0",
        icon: "k8s",
        cards: [
          {
            title: "集群与节点",
            summary: "K8s 集群就是一组协同工作的机器：有人负责指挥，有人负责干活。",
            points: [
              "集群（Cluster）由多台机器组成，每台机器称为一个节点（Node）",
              "控制平面（Control Plane）负责指挥调度，是集群的「大脑」",
              "工作节点上运行着真正的容器，接收控制平面下发的任务",
              "kubectl 是操作集群的命令行工具，几乎所有管理都通过它完成"
            ]
          },
          {
            title: "Pod：最小的调度单元",
            summary: "K8s 不直接管理单个容器，而是把一个或多个关系紧密的容器打包成 Pod。",
            points: [
              "Pod 是 K8s 中最小且不可再分的部署单元",
              "一个 Pod 内的容器共享网络和存储，彼此可以像本机一样通信",
              "每个 Pod 在集群内拥有自己的 IP，但 Pod 可能随时被重建，IP 不固定",
              "kubectl get pods 是查看 Pod 列表最常用的命令"
            ]
          },
          {
            title: "Deployment 与自愈",
            summary: "声明「我要 3 个副本」，剩下的交给 K8s：挂了自动补，更新自动换。",
            points: [
              "Deployment 声明期望状态，例如「始终运行 3 个 Pod 副本」",
              "节点宕机或 Pod 挂掉时，K8s 会自动重建，向期望状态收敛，这就是「自愈」",
              "滚动更新让新版本逐个替换旧版本，服务不中断",
              "Service 提供稳定的访问入口，把流量转发给背后不断变化的 Pod"
            ]
          }
        ],
        questions: [
          {
            id: "k8s-01",
            question: "在 Kubernetes 中，最小的可调度部署单元是？",
            options: [
              "Node（节点）",
              "Pod",
              "Container（容器）",
              "Deployment"
            ],
            answerIndex: 1,
            explanation: "K8s 不直接调度单个容器，而是把一个或多个容器打包成 Pod。Pod 才是集群里最小、不可再分的调度单元。",
            difficulty: "基础"
          },
          {
            id: "k8s-02",
            question: "Kubernetes 里的「Node」指的是什么？",
            options: [
              "集群中的一台工作机器（物理机或虚拟机）",
              "一种编程语言",
              "kubectl 的配置文件",
              "一个公共镜像仓库"
            ],
            answerIndex: 0,
            explanation: "Node 就是加入集群的每一台机器。工作节点负责运行 Pod 里的容器，并接受控制平面的统一调度。",
            difficulty: "基础"
          },
          {
            id: "k8s-03",
            question: "Deployment 最重要的能力是什么？",
            options: [
              "存储需要长期保存的数据",
              "给容器分配集群内部的 IP 地址",
              "按期望副本数管理 Pod，支持滚动更新与自愈",
              "加密和签名容器镜像"
            ],
            answerIndex: 2,
            explanation: "Deployment 负责维护「我要几个副本」这个期望状态：Pod 挂了自动重建，发布新版本时逐个替换、滚动更新。",
            difficulty: "基础"
          },
          {
            id: "k8s-04",
            question: "kubectl 这个命令行工具的作用是？",
            options: [
              "编写容器镜像的专用语言",
              "一种数据库的客户端",
              "前端页面的构建框架",
              "与 Kubernetes 集群通信、管理各种资源的工具"
            ],
            answerIndex: 3,
            explanation: "kubectl 把你的命令发给集群的 API，是管理 K8s 资源（Pod、Deployment 等）最常用的命令行入口。",
            difficulty: "基础"
          },
          {
            id: "k8s-05",
            question: "某 Pod 里的容器意外崩溃退出了，Kubernetes 会怎么做？",
            options: [
              "把这个 Pod 永久删除，不再理会",
              "自动重启整个集群",
              "按照重启策略自动重启容器，让实际状态回到期望状态",
              "直接忽略，等人工处理"
            ],
            answerIndex: 2,
            explanation: "节点上的 kubelet 会持续检查容器状态，发现崩溃后按照 Pod 的重启策略自动重启它，这体现了 K8s「向期望状态收敛」的自愈能力。",
            difficulty: "进阶"
          },
          {
            id: "k8s-06",
            question: "既然 Pod 的 IP 会随时变化，外部访问一组 Pod 通常依靠什么？",
            options: [
              "Service，提供稳定的访问入口并把流量转发给 Pod",
              "直接手写每台机器的 IP 地址",
              "Dockerfile",
              "关闭集群网络功能"
            ],
            answerIndex: 0,
            explanation: "Pod 会随时被重建、IP 随之变化，Service 通过标签选择器找到一组 Pod，对外提供稳定的访问地址，再把流量分发过去。",
            difficulty: "进阶"
          },
          {
            id: "k8s-07",
            question: "Kubernetes 的「声明式 API」是什么意思？",
            options: [
              "用户先手动创建 Pod，再逐台配置网络",
              "用户只声明期望状态，系统持续把实际状态调整到与之一致",
              "只能通过图形界面操作集群",
              "每次部署都要写完整的脚本来重新执行"
            ],
            answerIndex: 1,
            explanation: "声明式的核心是：你只说「我要 3 个副本」，不用说「怎么做到」。控制平面会不断比较实际与期望状态，并自动完成调整。",
            difficulty: "进阶"
          },
          {
            id: "k8s-08",
            question: "kubectl get pods 这条命令用来做什么？",
            options: [
              "创建一个新的 Pod",
              "删除集群里所有容器",
              "把日志导出到文件",
              "查看当前集群中 Pod 的列表和状态"
            ],
            answerIndex: 3,
            explanation: "get 表示「查询」，kubectl get pods 会列出集群里的 Pod 及其运行状态，是日常排查最常用的命令之一。",
            difficulty: "基础"
          }
        ]
      },

      /* ==================== Linux ==================== */
      {
        id: "linux",
        title: "Linux 命令行基础",
        tagline: "一个黑窗口，掌控整个服务器",
        description: "服务器上没有鼠标点选，全靠命令行沟通。掌握目录导航、文件操作和权限管理这三件套，你就有了和 Linux 服务器打交道的基本功。",
        level: "入门",
        estimatedMinutes: 28,
        accent: "#b25f1f",
        icon: "linux",
        cards: [
          {
            title: "目录导航",
            summary: "一切文件都挂在一棵从根 / 出发的树上，先学会在树上游走。",
            points: [
              "pwd 显示当前所在目录，cd 用于切换目录",
              "ls 列出目录内容，-l 长格式看详情，-a 能看到隐藏文件",
              "「.」表示当前目录，「..」表示上一级目录，cd .. 就是返回上级",
              "绝对路径从根 / 写起，相对路径从当前位置写起"
            ]
          },
          {
            title: "文件操作与搜索",
            summary: "创建、查看、删除文件是日常操作，grep 是在文件里找内容的神器。",
            points: [
              "mkdir 新建目录，touch 新建空文件，cp 复制，mv 移动或重命名",
              "rm 直接删除文件且默认不进回收站，操作前务必确认路径",
              "cat 查看小文件全部内容，less 分页翻看大文件",
              "grep \"关键词\" 文件名 可以搜出包含关键词的所有行"
            ]
          },
          {
            title: "权限与超级用户",
            summary: "Linux 是多用户系统，每个文件都有明确的「谁能读、谁能写、谁能执行」。",
            points: [
              "权限分三组：属主、属组、其他人；每组有 r（读）w（写）x（执行）",
              "ls -l 输出开头的 rwxr-xr-- 就是在描述这三组权限",
              "chmod 修改权限，例如 chmod +x script.sh 给脚本加上执行权限",
              "sudo 以管理员身份执行单条命令，权限大、误操作代价也大，用前多想一秒"
            ]
          }
        ],
        questions: [
          {
            id: "linux-01",
            question: "想知道自己当前处在哪个目录下，应该输入哪条命令？",
            options: [
              "ls",
              "cd",
              "pwd",
              "mkdir"
            ],
            answerIndex: 2,
            explanation: "pwd 的意思是 print working directory，专门用来显示当前所在的目录路径。ls 是列目录内容，cd 是切换目录。",
            difficulty: "基础"
          },
          {
            id: "linux-02",
            question: "想切换到 /home/user 目录，正确的命令是？",
            options: [
              "cd /home/user",
              "ls /home/user",
              "pwd /home/user",
              "open /home/user"
            ],
            answerIndex: 0,
            explanation: "cd（change directory）用于切换目录。ls 只会列出该目录的内容，并不会把工作目录切换过去。",
            difficulty: "基础"
          },
          {
            id: "linux-03",
            question: "ls -l 和直接使用 ls 有什么区别？",
            options: [
              "ls -l 会删除目录里的文件",
              "ls -l 以长格式显示文件权限、大小、修改时间等详细信息",
              "ls -l 只显示隐藏文件",
              "两者完全没有区别"
            ],
            answerIndex: 1,
            explanation: "默认的 ls 只显示文件名列表；加上 -l 后变成「长格式」，能看到权限、属主、大小、修改时间等详细信息。",
            difficulty: "基础"
          },
          {
            id: "linux-04",
            question: "想在当前目录下新建一个名为 notes 的文件夹，应该用？",
            options: [
              "touch notes",
              "mkdir notes",
              "cp notes",
              "cd notes"
            ],
            answerIndex: 1,
            explanation: "mkdir（make directory）用于新建目录。touch 新建的是空文件，cd 只能进入已存在的目录。",
            difficulty: "基础"
          },
          {
            id: "linux-05",
            question: "想在 log.txt 里找出所有包含 error 的行，应该用哪条命令？",
            options: [
              "find error log.txt",
              "grep \"error\" log.txt",
              "cat error",
              "rm error"
            ],
            answerIndex: 1,
            explanation: "grep 用于在文件中搜索匹配的行，会把包含 error 的每一行输出。find 是按文件名查找文件的，不是搜内容。",
            difficulty: "进阶"
          },
          {
            id: "linux-06",
            question: "关于 rm 命令，下面哪个说法是正确的？",
            options: [
              "rm 删除的文件默认会进入回收站",
              "rm 会永久删除文件，使用前一定要确认路径",
              "rm 只能删除空目录",
              "rm 必须在图形界面下才能运行"
            ],
            answerIndex: 1,
            explanation: "命令行里的 rm 是直接删除，没有回收站可后悔。删错目录（尤其是 rm -rf 用错路径）后果严重，执行前务必确认自己在哪、删的是什么。",
            difficulty: "基础"
          },
          {
            id: "linux-07",
            question: "Linux 权限里的 r、w、x 三个字母分别代表什么？",
            options: [
              "读（read）、写（write）、执行（execute）",
              "运行、写入、复制",
              "重命名、写入、退出",
              "读取、唤醒、执行"
            ],
            answerIndex: 0,
            explanation: "r/w/x 分别是读、写、执行三种权限。ls -l 输出里的 rwxr-xr-- 就是按「属主、属组、其他人」三组依次描述这三种权限。",
            difficulty: "进阶"
          },
          {
            id: "linux-08",
            question: "clear 这条命令的作用是？",
            options: [
              "删除当前目录下的所有文件",
              "清空终端屏幕上的显示",
              "关闭终端窗口",
              "清除用户的登录密码"
            ],
            answerIndex: 1,
            explanation: "clear 只是把屏幕上已有的输出清掉，让终端变干净，不会删除任何文件，也不会影响系统状态。",
            difficulty: "基础"
          }
        ]
      },

      /* ==================== Git ==================== */
      {
        id: "git",
        title: "Git 版本控制",
        tagline: "给代码装上「时光机」和「后悔药」",
        description: "Git 记录项目的每一次改动，让你随时回退、随时分支试验。它是团队协作的地基，也是每个程序员的必备技能。",
        level: "入门",
        estimatedMinutes: 25,
        accent: "#c2432b",
        icon: "git",
        cards: [
          {
            title: "仓库、提交与三个区域",
            summary: "改动从「工作区」经「暂存区」进入「仓库」，每一步都清晰可控。",
            points: [
              "仓库（Repository）是 Git 管理的项目目录，保存完整的历史记录",
              "改完文件后先 git add 放入暂存区，再 git commit 记录成一次快照",
              "git status 查看当前哪些文件被修改、哪些已暂存",
              "git log 可以翻看历史提交，每次提交都有唯一 ID 和说明"
            ]
          },
          {
            title: "分支与合并",
            summary: "分支让「平行世界」成为可能：开新功能不干扰主线，做完再合回来。",
            points: [
              "分支只是指向某次提交的可移动指针，创建它几乎不花成本",
              "git branch 查看/创建分支，git checkout 或 git switch 切换分支",
              "在独立分支上开发新功能，主线保持稳定可用",
              "合并（merge）把分支的改动汇回主线；两边改到同一处会产生冲突，需手工解决后再提交"
            ]
          },
          {
            title: "远程协作",
            summary: "把仓库放到远程（如 GitHub），团队才能克隆、推送、拉取，协同开发。",
            points: [
              "git clone 把远程仓库完整复制到本地",
              "git push 把本地提交上传到远程，git pull 拉取并合并远程的最新改动",
              "推送前先 pull，是减少冲突的好习惯",
              "提交说明写清楚「为什么改」，是给未来同事（和未来的自己）的礼物"
            ]
          }
        ],
        questions: [
          {
            id: "git-01",
            question: "git commit 这条命令的作用是？",
            options: [
              "把代码上传到远程仓库",
              "删除本地未提交的修改",
              "把暂存区的改动记录成一次版本快照",
              "自动创建一个新分支"
            ],
            answerIndex: 2,
            explanation: "commit 会把暂存区里的内容作为一次快照写进仓库历史，并附带提交说明。上传到远程要用的是 git push。",
            difficulty: "基础"
          },
          {
            id: "git-02",
            question: "想知道当前仓库里哪些文件被修改了，应该用哪条命令？",
            options: [
              "git status",
              "git push",
              "git clone",
              "git init"
            ],
            answerIndex: 0,
            explanation: "git status 会显示工作区和暂存区的状态：哪些文件改了、哪些已暂存、哪些还没被 Git 跟踪。",
            difficulty: "基础"
          },
          {
            id: "git-03",
            question: "git add 这个命令的作用是？",
            options: [
              "把文件改动放入暂存区，准备提交",
              "自动修复所有合并冲突",
              "把提交推送到远程仓库",
              "回滚上一次提交"
            ],
            answerIndex: 0,
            explanation: "git add 把指定文件的改动放进暂存区，下次 commit 只会包含暂存区里的内容。这个「先挑再存」的设计让你可以分批、有选择地提交。",
            difficulty: "基础"
          },
          {
            id: "git-04",
            question: "在 Git 中，分支的主要用途是什么？",
            options: [
              "给代码加密保护",
              "统计项目的代码行数",
              "压缩仓库的体积",
              "让不同的开发线互不干扰地并行进行"
            ],
            answerIndex: 3,
            explanation: "分支让你可以开一条独立的开发线去做新功能或修问题，主线不受影响，完成后再合并回去。团队协作和个人试验都依赖它。",
            difficulty: "基础"
          },
          {
            id: "git-05",
            question: "git push 的作用是？",
            options: [
              "把本地的提交上传到远程仓库",
              "拉取远程的最新代码",
              "合并两个分支",
              "查看提交历史"
            ],
            answerIndex: 0,
            explanation: "push 把本地仓库的提交推送到远程仓库（如 GitHub），让别人能看到你的改动。拉取远程更新用的是 git pull。",
            difficulty: "基础"
          },
          {
            id: "git-06",
            question: "git clone 这条命令会做什么？",
            options: [
              "提交当前的所有改动",
              "切换到另一个分支",
              "把远程仓库完整地复制一份到本地",
              "比较两个版本的差异"
            ],
            answerIndex: 2,
            explanation: "git clone 会把远程仓库连同全部历史记录复制到本地，是加入一个已有项目时的第一步。",
            difficulty: "基础"
          },
          {
            id: "git-07",
            question: "从修改代码到进入仓库历史，正确的流程顺序是？",
            options: [
              "工作区 → git commit → 暂存区 → git add → 仓库",
              "工作区 → git add → 暂存区 → git commit → 仓库",
              "暂存区 → git add → 工作区 → git commit → 仓库",
              "仓库 → git add → 工作区 → git commit → 暂存区"
            ],
            answerIndex: 1,
            explanation: "标准流程是：在工作区编辑文件，用 git add 把改动放入暂存区，再用 git commit 把暂存区内容记录进仓库历史。",
            difficulty: "进阶"
          },
          {
            id: "git-08",
            question: "合并分支时出现冲突（conflict），正确的处理方式是？",
            options: [
              "放弃合并并删除其中一个分支",
              "重启电脑，Git 会自动解决冲突",
              "必须联系 Git 的官方客服远程处理",
              "手工编辑冲突文件，保留正确内容后 add 并提交"
            ],
            answerIndex: 3,
            explanation: "Git 会用 <<<<<<< 等标记标出冲突位置，需要你打开文件、判断保留哪些内容，然后 git add 标记冲突已解决并完成提交。",
            difficulty: "进阶"
          }
        ]
      }
    ]
  };
}));
