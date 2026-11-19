# GitLab SRE / DevOps 核心知识点（笔试面试版）

> 面向 GitLab SRE / DevOps 笔试与面试的系统复习资料。  
> 版本约定：以 GitLab 17/18 为主线；涉及 **Premium / Ultimate** 的功能会单独标注，CE（社区版）不可用。GitLab 迭代较快，具体 UI 路径与默认值以所在实例版本文档为准。

**复习建议**：先看每节开头的一句话结论，再对照表格记忆，最后用每节末尾真题自测。回答“区别类”问题时，优先从**历史形态、是否改写提交、适用场景、风险**四个维度展开。

## 目录

1. Git 基础核心
2. GitLab 基础概念
3. GitLab 权限体系
4. GitLab CI/CD 核心
5. GitLab Runner
6. 运维与安全
7. 考前速记与自测清单

---

## 一、Git 基础核心

> **一句话结论：merge 保留历史，rebase 重写历史；公共分支只 merge，私有分支可 rebase。**

### 1.1 三个区域与一次提交的旅程

| 区域 | 英文 | 作用 | 典型命令 |
| --- | --- | --- | --- |
| 工作区 | Working Directory | 你正在编辑的文件 | `git status`、`git diff` |
| 暂存区 | Staging Area / Index | 下一次提交的快照 | `git add`、`git restore --staged` |
| 本地仓库 | Local Repository | 提交历史与对象库 | `git commit`、`git log` |
| 远程仓库 | Remote Repository | 团队共享的裸仓库 | `git push`、`git fetch` |

一次提交的主链路：

```text
工作区 ──git add──▶ 暂存区 ──git commit──▶ 本地仓库 ──git push──▶ 远程仓库
   ▲                                                        │
   └──────────────── git checkout / restore ◀───────────────┘
```

Git 的核心对象是 **blob（文件内容）→ tree（目录）→ commit（快照 + 父提交）→ tag（标签）**。分支只是一个指向 commit 的**可移动指针**，`HEAD` 指向当前分支或当前提交，因此创建/切换分支的成本极低。

### 1.2 高频易混命令

| 命令对 | 核心区别 | 使用建议 |
| --- | --- | --- |
| `fetch` vs `pull` | fetch 只更新远程跟踪分支，不动工作区；pull = fetch + merge/rebase | 想先看再合就用 fetch；日常可用 `pull --rebase` |
| `reset` vs `revert` | reset 移动分支指针、改写历史；revert 新增一个反向提交 | 本地未推送用 reset，公共分支用 revert |
| `checkout` vs `switch/restore` | checkout 兼管切分支与还原文件，语义模糊；switch 只管分支，restore 只管文件 | 新版本优先 switch/restore |
| `merge` vs `rebase` | 合并历史 vs 重放提交 | 见 1.3 |
| `clone` vs `fetch` | clone 是首次完整复制并建立 remote；fetch 是增量更新 | 已有仓库不要重复 clone |
| `tag` vs `branch` | tag 固定指向某个提交；branch 会随新提交移动 | 发布用 annotated tag |
| `origin/main` vs `main` | 前者是远程跟踪分支（只读），后者是本地分支 | 看到 origin/main 领先时先 fetch/merge |

**重点：`git fetch` 不会修改你的工作区，也不会自动合并；`git pull` 默认是 fetch + merge，配置 `pull.rebase=true` 后变为 fetch + rebase。**

### 1.3 分支策略

分支策略的本质是回答三个问题：**主线是谁、改动活多久、如何发布**。

| 策略 | 长期分支 | 分支生命周期 | 优点 | 缺点 | 适用场景 |
| --- | --- | --- | --- | --- | --- |
| **Git Flow** | `main` + `develop` | feature/release/hotfix 较长 | 发布节奏清晰，适合版本化产品 | 分支多、合并复杂、反馈慢 | 传统软件、有明确版本窗口 |
| **GitHub Flow** | `main` | 短分支 + PR，合并即部署 | 简单、持续交付友好 | 对 CI 与测试要求高 | SaaS、小团队 |
| **GitLab Flow** | `main` + 环境/发布分支 | 功能分支短；环境分支长期 | 兼顾持续交付与环境隔离 | 需要严格的向上游合并纪律 | 多环境部署、版本发布 |
| **Trunk-based** | `main`（trunk） | 分支存活 < 1 天，靠 feature flag | 集成最快、冲突最少、DORA 指标好 | 强依赖自动化测试与开关治理 | 高成熟度团队、互联网产品 |

**GitLab Flow** 的两种常见形态：

1. **环境分支**：`main → staging → production`，代码只向一个方向流动，生产问题先在 main 修复，再向下游 cherry-pick。
2. **发布分支**：`main` 开发，`release/1.2` 冻结发布，适合需要长期维护多个版本的场景。

**分支命名建议**：

| 前缀 | 用途 | 示例 |
| --- | --- | --- |
| `feature/` | 新功能 | `feature/123-login-sso` |
| `fix/` | 普通缺陷 | `fix/456-null-pointer` |
| `hotfix/` | 生产紧急修复 | `hotfix/789-payment-timeout` |
| `release/` | 发布准备 | `release/2.3.0` |
| `chore/`、`docs/` | 工程/文档 | `chore/bump-node-20` |

**选择建议**：小团队、持续部署优先 GitHub Flow 或 trunk-based；有明确版本与多环境需求用 GitLab Flow；Git Flow 适合发布窗口固定、审批链长的组织，但要接受其复杂度。**分支策略没有绝对优劣，关键是与 CI、发布方式、团队规模匹配。**

### 1.4 Merge 与 Rebase

```text
# merge：保留分叉，生成合并提交 M
main:    A---B-------M
              \     /
feature:       C---D

# rebase：把 C、D 重放到 B 之后，生成新提交 C'、D'
main:    A---B---C'---D'
```

| 维度 | **Merge** | **Rebase** |
| --- | --- | --- |
| 本质 | 合并两个历史；无法快进时生成 merge commit | 把当前分支的提交逐个“摘下来”，重放到新基底 |
| 历史形态 | 分叉再汇合，保留真实时间线 | 线性，看起来像从未分叉 |
| 提交 SHA | 原提交不变，只新增合并提交 | 被重放的提交**全部生成新 SHA** |
| 冲突处理 | 通常在合并时集中解决一次 | 可能每个被重放的提交都要解决一次 |
| 可追溯性 | 保留分支上下文与合并时间点，便于审计 | 历史干净，但丢失“何时、从哪合并”的信息 |
| 对公共分支的安全性 | 安全 | **危险：改写历史，禁止用于已共享分支** |
| 回滚 | revert 合并提交需 `-m 1` 指定主线 | 回滚直观，但 SHA 已变化 |
| 典型场景 | 功能分支合入 main、发布合并 | 同步上游、整理本地提交、合并前线性化 |
| 常用命令 | `git merge feature` | `git rebase main` |

**黄金法则：不要 rebase 任何已经推送到公共仓库、且可能被别人基于其开发的分支。** 需要同步上游时，只 rebase 自己的本地提交；推送被改写的历史必须用 `git push --force-with-lease`，并提前通知协作者。

**GitLab MR 的合并方式**：

| 项目设置 | 行为 | 历史效果 | 适合 |
| --- | --- | --- | --- |
| Merge commit | 总是生成 merge commit | 保留分支结构 | 需要完整上下文 |
| Merge commit with semi-linear history | 能快进就快进，否则生成 merge commit；first-parent 保持线性 | 兼顾线性与可追溯 | **大多数团队的推荐值** |
| Fast-forward merge | 只允许快进，源分支需先 rebase | 完全线性 | 追求极简历史 |
| Squash（可叠加以上） | 合并时把 MR 内多个提交压成一个 | 主线只多一个提交 | 提交粒度混乱的 MR |

**Squash 与 Rebase 的区别**：

- **Squash** 发生在合并阶段（GitLab 服务端），把整个 MR 压成一个新提交，丢弃中间提交；适合 WIP 多、提交信息杂的 MR。
- **Rebase** 通常发生在本地，保留每个提交的粒度，只更换基底；适合提交质量高、希望保留演进过程的 MR。
- 两者都会产生新 SHA；squash 后本地分支与主干历史不再一致，继续开发应重新拉分支。

#### 冲突时 `ours` / `theirs` 的反转（高频陷阱）

| 场景 | `--ours` 指 | `--theirs` 指 |
| --- | --- | --- |
| `git merge` | 当前分支（HEAD） | 被合并进来的分支 |
| `git rebase` | **基底分支（upstream/main）** | **你正在重放的提交** |

rebase 时 Git 把你的提交“应用到”基底上，因此基底成了 ours，你的提交成了 theirs。执行 `git checkout --ours <file>` 在 rebase 中拿到的是 main 的版本，而不是你的版本。

### 1.5 解决冲突的标准流程

**Merge 冲突**：

```bash
git switch feature/login
git fetch origin
git merge origin/main          # 出现冲突
git status                     # 查看 conflicted 文件
# 编辑文件，删除 <<<<<<< ======= >>>>>>> 标记
git add <file>
git commit                     # 完成合并提交
# 放弃合并
git merge --abort
```

**Rebase 冲突**：

```bash
git fetch origin
git rebase origin/main
# 逐个提交解决冲突
git add <file>
git rebase --continue
# 跳过当前提交（慎用）
git rebase --skip
# 放弃整个 rebase，回到起点
git rebase --abort
# rebase 完成后推送
git push --force-with-lease
```

**实用命令**：

```bash
git diff --name-only --diff-filter=U   # 只列出冲突文件
git checkout --ours <file>             # 注意：rebase 时语义反转
git checkout --theirs <file>
git mergetool                          # 图形化合并
git config rerere.enabled true         # 复用冲突解决记录
git rerere                             # 再次遇到相同冲突时自动应用
```

**减少冲突的工程手段**：

- 小 MR、短分支、频繁同步主干，避免“大爆炸式”合并。
- 统一格式化工具（Prettier、gofmt），避免无关的空白/换行 diff。
- lockfile 冲突优先“删除后重新生成”，不要手工逐行合并。
- 用 `.gitattributes` 指定二进制文件或自定义合并驱动。
- 用 `CODEOWNERS` 让熟悉模块的人 review，减少语义冲突。
- 团队允许时，在合并前 rebase 或启用 semi-linear merge，保持 first-parent 干净。

### 1.6 撤销、回退与救火

| 需求 | 命令 | 是否改写历史 | 说明 |
| --- | --- | --- | --- |
| 丢弃工作区修改 | `git restore <file>` | 否 | 不可恢复，先确认 |
| 取消暂存 | `git restore --staged <file>` | 否 | 回到未 add 状态 |
| 修改最后一次提交 | `git commit --amend` | 是 | 仅限未推送 |
| 撤销本地提交、保留改动 | `git reset --soft HEAD~1` | 是 | 改动回到暂存区 |
| 撤销本地提交、取消暂存 | `git reset --mixed HEAD~1` | 是 | reset 默认模式 |
| 彻底丢弃本地提交 | `git reset --hard HEAD~1` | 是 | 危险，先确认无未提交内容 |
| 撤销已推送提交 | `git revert <sha>` | 否 | **公共分支首选**，新增反向提交 |
| 撤销 merge commit | `git revert -m 1 <merge-sha>` | 否 | `-m 1` 表示保留第一父提交（主线） |
| 拣选某个提交 | `git cherry-pick <sha>` | 新 SHA | hotfix 到 release 的常用手段 |
| 临时保存现场 | `git stash -u` | 否 | `pop` 恢复并删除，`apply` 保留 |
| 找回 reset 掉的提交 | `git reflog` | 否 | 本地操作日志，救命稻草 |

**已推送提交的处理原则**：公共分支用 `revert`，保留完整的“引入—撤销”审计链；只有确认无人基于该分支开发时，才用 `reset + push --force-with-lease`，并提前通知。`--force-with-lease` 会在远程有新提交时拒绝覆盖，比 `--force` 安全。

### 真题

**真题 1（概念题）**：请说明 `git merge` 与 `git rebase` 的区别，并说明团队中应该如何选择。

**解析**：

- merge 保留分叉历史，生成 merge commit，原提交 SHA 不变；rebase 把提交重放到新基底，生成新 SHA，历史线性。
- rebase 让历史“看起来从未分叉”，但丢失合并时间点，且会改写历史，因此**不能 rebase 已共享的公共分支**。
- 选择：功能分支合入 main 用 merge（或平台侧 squash/rebase merge）；同步上游、整理本地提交用 rebase；发布分支、多人协作分支禁止 rebase。
- 加分点：`--force-with-lease`、`git pull --rebase`、semi-linear merge、`git rerere`。

**真题 2（场景题）**：你在 `feature/login` 上 rebase `main` 时发生冲突，执行 `git checkout --ours login.js` 后为什么拿到的是 main 的版本？应该怎么处理？

**解析**：

- rebase 时 Git 把“基底（main）”当作 ours，把“你正在重放的提交”当作 theirs，与 merge 场景相反。
- 想保留自己的修改应使用 `--theirs`（或手工合并）；想保留 main 的版本用 `--ours`。
- 处理完执行 `git add` + `git rebase --continue`；放弃用 `git rebase --abort`。
- 加分点：`git diff --diff-filter=U` 查看冲突文件；`git rerere` 复用解决记录；rebase 后推送用 `--force-with-lease`。

## 二、GitLab 基础概念

> **一句话结论：Group 管人和权限，Project 管代码和流水线；MR 是变更进入受保护分支的唯一通道。**

### 2.1 Group / Subgroup / Project 层级

```text
GitLab Instance
└── Group（顶层组，如 platform）
    ├── Subgroup（如 platform/backend）
    │   └── Project（如 platform/backend/api）
    └── Project（如 platform/infra）
```

**Namespace（命名空间）** 是用户或组的唯一路径。项目的完整路径为 `group/subgroup/project`，例如 `platform/backend/api`；它同时决定 clone URL、仓库路径、CI 变量继承范围与权限边界。

| 层级 | 作用 | 关键能力 | 权限继承 |
| --- | --- | --- | --- |
| **Group** | 组织团队/部门 | 成员管理、群组 Runner、群组变量、Epics（Ultimate）、审计事件 | 向下继承到子组和项目 |
| **Subgroup** | 细分团队/业务线 | 独立成员、变量、Runner；默认最多嵌套 20 层 | 继承父组，可继续细分 |
| **Project** | 一个代码仓库及配套能力 | 仓库、Issue、MR、CI/CD、Registry、Pages、Wiki | 继承所属组 |
| **User Namespace** | 个人空间 | 个人项目 | 个人所有 |

**关键规则**：

- **权限自上而下继承**：Group 成员自动获得子组和项目中的对应角色。
- **可见性不能比父级更宽松**：私有组下不能创建公开项目；子组不能比父组更公开。
- **群组变量与群组 Runner 向下继承**；项目级变量只作用于该项目。
- **Fork 是独立项目**：有独立的 CI/CD、Issue、权限和 Star，适合开源贡献；内部功能开发应使用分支，而不是 Fork。
- **项目可转移**：路径变化会影响 clone URL；GitLab 通常会保留重定向，但 CI 配置、Webhook、徽章、子模块、部署脚本仍需逐一检查。

| 概念 | 是否独立项目 | 共享成员 | 共享群组变量 | 典型用途 |
| --- | --- | --- | --- | --- |
| **Branch** | 否 | 是 | 是 | 日常功能开发、MR |
| **Fork** | 是 | 否（需显式添加） | 否 | 开源/外部贡献者隔离 |
| **Project** | 是 | 继承组 | 是 | 一个服务或一个仓库 |
| **Subgroup** | 否 | 继承父组 | 是 | 部门/团队分层治理 |

### 2.2 项目可见性

| 可见性 | 匿名用户 | 已登录用户 | 项目成员 | 说明 |
| --- | --- | --- | --- | --- |
| **Private** | 不可见 | 不可见 | 按角色访问 | 企业默认，最常用 |
| **Internal** | 不可见 | 可只读查看 | 按角色访问 | 仅实例内用户可见 |
| **Public** | 可查看/克隆 | 可查看/克隆 | 按角色访问 | 开源项目 |

**注意**：可见性受父组限制；Public 项目的代码默认可被匿名 clone，敏感项目不要使用 Public。即使项目 Public，CI/CD 变量、Runner、部署环境仍应按最小权限保护。

### 2.3 Merge Request（MR）流程

标准流程：

1. **Issue** 描述需求/缺陷，明确验收标准与影响范围。
2. 从最新 main 拉分支：`git switch -c feature/xxx origin/main`。
3. 小步提交并推送：`git push -u origin feature/xxx`。
4. **创建 MR**（UI 或 push option），填写标题、描述、关联 Issue（`Closes #123`）、Reviewer、Assignee、Labels、Milestone。
5. **CI 触发**：lint、test、build、安全扫描；失败则修复后重跑。
6. **Review**：行内评论、建议修改、Resolve discussion；必要时补充提交。
7. **审批**：Approval rules / Code Owners（Premium）；所有讨论必须 resolved。
8. **合并**：选择合并方式、是否 squash、是否删除源分支；合并后触发部署流水线。
9. **验证**：环境健康检查、指标观察、回滚预案。

| MR 机制 | 作用 | 备注 |
| --- | --- | --- |
| **Draft MR** | 标记未完成，阻止误合并 | 标题以 `Draft:` 开头（旧版 `WIP:`） |
| **Squash** | 合并时压成一个提交 | 项目可设默认开启 |
| **Auto-merge** | 流水线通过后自动合并 | 旧称 Merge when pipeline succeeds |
| **Merge train** | 多个 MR 排队合并，避免互相破坏 | Premium；需要 merge commit 模式 |
| **Merged results pipeline** | 在临时合并结果上跑流水线 | Premium；更接近真实合并后状态 |
| **Approval rules** | 指定人或组审批 | Premium |
| **Code Owners** | 按文件路径指定必须审批人 | Premium；`.gitlab/CODEOWNERS` |
| **Merge checks** | 流水线成功、讨论 resolved、审批通过 | 可在项目设置中开关 |
| **MR dependencies** | 阻塞关系，前置 MR 合并后才能合 | Premium |
| **Push options** | 推送时直接创建/更新 MR | 见下方示例 |

```bash
git push -u origin feature/login \
  -o merge_request.create \
  -o merge_request.target=main \
  -o merge_request.title="feat: 登录页" \
  -o merge_request.remove_source_branch
```

**合并方式速查**：

| 项目设置 | 结果 | 适合 |
| --- | --- | --- |
| Merge commit | 总是生成 merge commit | 需要完整分支上下文 |
| Merge commit with semi-linear history | 能快进则快进，否则生成 merge commit；first-parent 线性 | 大多数团队推荐 |
| Fast-forward merge | 只允许快进，源分支需先 rebase | 追求完全线性历史 |
| Squash | 合并为一个提交 | 提交粒度混乱的 MR |

**MR 流水线 vs 分支流水线**：

- **分支流水线**：push 到分支触发，`CI_COMMIT_BRANCH` 可用。
- **MR 流水线**：`CI_PIPELINE_SOURCE == "merge_request_event"` 触发，`CI_MERGE_REQUEST_*` 可用，但 `CI_COMMIT_BRANCH` **不可用**。
- 两者可能同时触发，造成重复流水线；应在 `workflow:rules` 中去重（见 4.3）。

### 2.4 保护分支机制

**保护分支（Protected Branch）** 是对匹配分支模式（如 `main`、`release/*`）施加的规则集合：

- 谁可以 **push**
- 谁可以 **merge**
- 谁可以 **force push**
- 是否允许删除
- 是否要求 Code Owner / 审批
- 是否要求流水线成功

配置路径：**Settings → Repository → Protected branches**，支持通配符（`release/*`、`hotfix/*`）。

**默认行为**：新项目的默认分支（通常是 `main`）自动受保护；默认 Maintainer 可 push/merge，force push 关闭。

| 分支 | 允许 push | 允许 merge | force push | 说明 |
| --- | --- | --- | --- | --- |
| `main` | **No one** | Maintainers | 禁止 | 只走 MR，最严格 |
| `develop` | Developers | Developers | 禁止 | 集成分支 |
| `release/*` | Maintainers | Maintainers | 禁止 | 发布冻结 |
| `feature/*` | Developers | Developers | 允许（个人分支） | 通常不保护 |
| `v*`（tag） | Maintainers | — | — | 保护发布标签 |

| 机制 | 解决的问题 | 层级 |
| --- | --- | --- |
| **Protected branch** | 防直推、强推、删除 | 分支 |
| **Protected tag** | 防随意修改/删除发布标签 | 标签 |
| **Push rules** | commit 规范、签名、密钥扫描、文件大小 | 推送（Premium） |
| **Approval rules** | 合并需指定人数/角色审批 | MR（Premium） |
| **Code Owners** | 指定路径必须由 owner 批准 | MR（Premium） |
| **Merge checks** | 流水线、讨论、审批状态 | MR |
| **Protected environment** | 限制谁能部署 production | 环境（Premium） |

**常见报错**：`You are not allowed to push code to protected branches on this project.`  
处理方式：走 MR；或由 Maintainer 调整保护规则。**不要为了省事把 Developer 加入 push 白名单**，这会绕过整个评审与流水线门禁。

**保护分支不是万能的**：Maintainer/Owner 仍可修改规则；需要配合审计事件、分离职责、保护环境和 Runner 隔离。真正的生产安全是“权限 + 流程 + 审计”的组合。

### 真题

**真题 1**：一个新项目要求 main 只能通过 MR 合入，至少一人 review，且流水线必须通过。请描述配置步骤。

**解析**：

- **Settings → Repository → Protected branches**：将 `main` 设为 Protected；Allowed to push 设为 `No one`；Allowed to merge 设为 `Maintainers`；关闭 force push。
- **Settings → Merge requests**：开启 “Pipelines must succeed”、“All discussions must be resolved”；开启 approval rules（Premium）要求至少 1 个 approval；可配 Code Owners。
- CI 中为 MR 配置 lint/test/build，用 `rules` 限定在 MR 与 main 上运行。
- 加分点：默认删除源分支；push rules 禁止直接推 main；`CODEOWNERS` 指定关键目录；定期审计保护分支配置。

**真题 2**：Group、Subgroup、Project 的权限如何继承？如果把项目从组 A 移到组 B，会有什么影响？

**解析**：

- Group 成员权限向下继承到 Subgroup 和 Project；同一用户在多处有角色时取**最高角色**；不能通过在下级降低角色来“屏蔽”上级权限，必须移除上级成员关系。
- 项目转移后 namespace/path 变化，clone URL 变化；GitLab 通常保留重定向，但需更新 CI 配置、Webhook、徽章、部署脚本、子模块。
- 群组级变量/Runner 不会随项目带走；项目级变量随项目；需重新授权成员并检查保护分支、审批规则。
- 加分点：转移前备份与通知；检查 Registry/Pages 域名；转移后跑一次完整流水线验证。

## 三、GitLab 权限体系

> **一句话结论：Guest 看事、Reporter 看码、Developer 写码、Maintainer 管项目、Owner 管生死。**

### 3.1 五级角色定位

| 角色 | 定位 | 典型人群 | 关键限制 |
| --- | --- | --- | --- |
| **Guest** | 只读协作 | 外部观察者、需求方、审计旁观者 | 私有项目**看不到代码**，不能 clone/下载产物 |
| **Reporter** | 只读代码 + 看流水线 | PM、QA、数据/安全分析、外包验收 | 不能 push、不能创建 MR |
| **Developer** | 日常开发 | 工程师、SRE（执行侧） | 不能改保护分支/CI 变量/项目设置/成员 |
| **Maintainer** | 项目管理员 | Tech Lead、项目 SRE | 不能删除/转移项目、不能管理群组 |
| **Owner** | 最高权限 | 组负责人、平台负责人 | 可删组/项目、管理 Owner；仍受实例管理员约束 |

**补充角色**：GitLab 还有 **Minimal Access**（Ultimate，仅用于满足成员关系/合规，几乎无实际权限）和 **Planner**（偏规划，可管理 Issue/Epic，不写代码）等；笔试通常以五级为主。

### 3.2 能力矩阵

> ✅ = 默认具备；⚠️ = 取决于保护分支/项目设置；❌ = 默认不具备。具体以实例版本为准。

| 能力 | Guest | Reporter | Developer | Maintainer | Owner |
| --- | :---: | :---: | :---: | :---: | :---: |
| 查看项目、Issue、MR 讨论 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 创建/评论 Issue | ✅ | ✅ | ✅ | ✅ | ✅ |
| 查看私有项目代码 / clone | ❌ | ✅ | ✅ | ✅ | ✅ |
| 查看 job 日志 / 下载 artifacts | ❌ | ✅ | ✅ | ✅ | ✅ |
| 创建分支 / push 非保护分支 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 创建 MR | ❌ | ❌ | ✅ | ✅ | ✅ |
| 运行 / 重试 / 取消流水线 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 创建 tag（受保护标签除外） | ❌ | ❌ | ✅ | ✅ | ✅ |
| 合并 MR（默认保护分支） | ❌ | ❌ | ❌ | ✅ | ✅ |
| 直接 push 保护分支（默认） | ❌ | ❌ | ❌ | ✅ | ✅ |
| 修改 CI/CD 变量 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 管理项目/群组 Runner | ❌ | ❌ | ❌ | ✅ | ✅ |
| 配置保护分支 / 保护标签 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 管理项目成员（不能授予 Owner） | ❌ | ❌ | ❌ | ✅ | ✅ |
| 修改项目设置 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 删除 / 转移项目 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 管理群组成员 / 群组设置 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 删除群组 | ❌ | ❌ | ❌ | ❌ | ✅（顶级组） |
| 管理 GitLab 实例 | ❌ | ❌ | ❌ | ❌ | ❌（需 Admin） |

**两个容易记错的点**：

1. **Developer 默认不能合并保护分支**。保护分支的 “Allowed to merge” 默认是 Maintainers；即使 Developer 创建了 MR，也需要 Maintainer 点合并，除非显式放开。
2. **Maintainer 不是“项目 Owner”**。Maintainer 能改设置、管成员、管 Runner，但不能删除/转移项目、不能管理群组、不能授予 Owner。

**项目级 Owner 的边界**：项目级 Owner 主要对个人命名空间项目有意义；组内项目的最高权限来自 **Group Owner** 的继承。实际排障时先看用户是“组成员”还是“项目成员”，再看有效角色。

### 3.3 继承、边界与最小权限

- **继承取最高角色**：用户同时是组 Maintainer、项目 Developer 时，有效角色是 Maintainer。
- **不能靠下级降权**：给用户在项目里设 Guest 不能抵消其组 Owner 权限；要降权只能移除组关系或调整组角色。
- **顶层组 Owner 影响面最大**：相当于该组织范围的“超级管理员”，应严格控制人数并开启 2FA。
- **共享项目（Group sharing）** 会引入外部组成员；定期审计，避免权限外溢。
- **离职流程**：先 **Block** 用户（保留审计与提交归属），再移除组成员关系；不要只删项目成员。
- **机器人身份**：
  - **Deploy Token**：仓库/Registry 的只读或读写令牌，适合 CI 拉取依赖。
  - **Deploy Key**：单仓库 SSH 公钥，适合服务器拉代码。
  - **Project/Group Access Token**：细粒度 scope、可设过期时间，必须定期轮换。
- **CI 变量**：Masked（日志脱敏）+ Protected（仅保护分支可用）+ Environment scope（按环境隔离）；生产密钥不要放普通变量。
- **`CI_JOB_TOKEN`**：权限有限，但仍应配置 allowlist；Fork MR 的流水线默认需要维护者批准，避免恶意代码窃取密钥。
- **自定义角色（Ultimate）**：可细粒度授予“只读 CI/CD”“只读仓库”等能力，但不要用它替代清晰的分组设计。

**权限设计三步法**：

1. 按团队建 Group/Subgroup，角色授予组，不逐项目加人。
2. 项目内只给例外权限；保护分支默认收紧，部署环境单独保护。
3. 用审计事件、成员导出、访问令牌清单做季度复核。

### 真题

**真题 1**：Guest、Reporter、Developer 的核心区别是什么？一位外部测试同学需要看代码、下载构建产物、提 Issue，但不应改代码，应给什么角色？

**解析**：

- **Guest**：可看 Issue/MR 讨论、提 Issue/评论；私有项目看不到代码，不能 clone/下载产物。
- **Reporter**：可看代码、clone、看流水线/job 日志、下载 artifacts；不能 push、不能建 MR。
- **Developer**：可 push 非保护分支、建 MR、跑流水线；不能改保护分支/CI 变量/项目设置。
- 测试同学给 **Reporter** 即可满足“看代码 + 下载产物 + 提 Issue”。若还需要触发流水线或跑手动 job，才考虑 Developer，并配合保护分支。
- 加分点：最小权限；生产部署用 Protected environment 单独授权；不要给 Maintainer。

**真题 2**：Developer 能否直接 push 到 main？能否修改 CI/CD 变量？如何让 Developer 可以合并 MR 但不能直接 push？

**解析**：

- 默认**不能** push 保护分支；能否合并取决于保护分支的 “Allowed to merge”（默认 Maintainers）。
- Developer 默认**不能**修改项目 CI/CD 变量（需要 Maintainer）。
- 配置：Protected branches 中 main 的 “Allowed to push” 设为 `No one`，“Allowed to merge” 设为 `Developers`（或 Maintainers）；这样只能通过 MR 合并。
- 加分点：配合 approval rules、push rules、分支命名规则；不要让 Developer 拥有修改保护分支配置的权限。

## 四、GitLab CI/CD 核心

> **一句话结论：Pipeline 由 stage 串行、job 并行；rules 决定“跑不跑”，cache 加速、artifacts 传递。**

### 4.1 核心模型

```text
Pipeline
├── Stage: build
│   ├── Job: compile
│   └── Job: lint          # 同 stage 并行
├── Stage: test
│   └── Job: unit-test
└── Stage: deploy
    └── Job: deploy-prod   # 默认需前序 stage 成功
```

- **Pipeline**：一次完整的流水线执行。
- **Stage**：阶段，默认按顺序串行；同一 stage 内的 job 并行。
- **Job**：最小执行单元，由某个 Runner 领取并执行。
- 默认 stage 为 `.pre → build → test → deploy → .post`；`.pre` 永远最先，`.post` 永远最后。
- Job 未写 `stage` 时默认进入 `test` 阶段。
- Job 状态：`pending → running → success / failed / canceled / skipped / manual`。

`.gitlab-ci.yml` 放在仓库根目录；首次创建流水线后配置会存入数据库，之后修改仓库文件即生效。调试可用 **CI Lint**（项目 → Build → Pipeline editor → Validate）。

| 流水线类型 | 触发方式 | 关键变量 | 典型用途 |
| --- | --- | --- | --- |
| 分支流水线 | push 分支 | `CI_COMMIT_BRANCH` | 日常 CI |
| MR 流水线 | MR 事件 | `CI_MERGE_REQUEST_*` | 合并前验证 |
| Tag 流水线 | push tag | `CI_COMMIT_TAG` | 版本发布 |
| 定时流水线 | Schedule | `CI_PIPELINE_SOURCE=schedule` | 夜间构建、扫描 |
| 手动/API | UI/API | `CI_PIPELINE_SOURCE=web/api` | 手动发布、自动化调用 |
| 多项目流水线 | `trigger` | `CI_PIPELINE_SOURCE=trigger` | 上下游联动 |
| 父子流水线 | `trigger:include` | `CI_PIPELINE_SOURCE=parent_pipeline` | 大流水线拆分 |
| Merge train | 合并队列 | `CI_MERGE_REQUEST_*` | 排队合并（Premium） |

### 4.2 核心关键字总览

```yaml
stages: [build, test, deploy]

default:
  image: alpine:3.20
  before_script:
    - echo "global before_script"

variables:
  APP_ENV: "staging"

cache:
  key:
    files: [package-lock.json]
  paths: [.npm/]

build:
  stage: build
  script:
    - echo "build"
  artifacts:
    paths: [dist/]
    expire_in: 1 week

test:
  stage: test
  needs: [build]
  script:
    - echo "test"
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

| 类别 | 关键字 | 作用 | 备注 |
| --- | --- | --- | --- |
| 结构 | `stages`、`stage`、`script`、`before_script`、`after_script` | 定义阶段与执行脚本 | `script` 必填（或用 `trigger`） |
| 环境 | `image`、`services`、`tags`、`variables` | 指定镜像、服务容器、Runner、变量 | `tags` 必须与 Runner 标签匹配 |
| 依赖 | `needs`、`dependencies` | DAG 调度、控制 artifacts 下载 | `needs` 可打破 stage 顺序 |
| 控制 | `rules`、`only/except`、`when`、`allow_failure`、`retry`、`timeout`、`interruptible`、`resource_group` | 决定是否执行、失败策略、并发控制 | 新项目用 `rules` |
| 产物 | `cache`、`artifacts`、`coverage` | 加速与交付 | 两者用途不同，见 4.4 |
| 复用 | `extends`、`include`、`default`、`!reference` | 模板化、拆分配置 | `extends` 数组合并是“覆盖” |
| 部署 | `environment`、`release`、`pages`、`secrets`、`id_tokens` | 环境、发布、密钥 | 生产环境建议保护 |
| 全局 | `workflow` | 控制是否创建流水线 | 去重的关键 |

#### 4.2.1 `stages` 与 `script`

- `script` 是 job 的必填项；`before_script` 在所有 job 的 `script` 前执行，`after_script` 在之后执行。
- **`before_script` 与 `script` 会拼接进同一个 shell 脚本**，所以 `cd`、`export` 在同一 job 内有效；**`after_script` 在独立 shell 中执行**，看不到前面的 `cd`/环境变量（除非写入文件或使用 artifacts）。
- **`after_script` 失败不会改变 job 状态**，适合清理现场；但不要把它当关键校验。
- `script` 中每行默认由 shell 逐行执行；`|` 多行块会作为一个整体，适合复杂逻辑。
- 含冒号的命令（如 `echo "a: b"`）要加引号，避免 YAML 解析错误。
- `retry` 最多 2 次；`timeout` 可覆盖项目默认（通常 60 分钟）。
- 实验性 job 可加 `allow_failure: true`，避免阻塞流水线。

#### 4.2.2 `rules`（推荐）

`rules` 是一个**从上到下求值、首个匹配生效**的列表：

```yaml
deploy:
  stage: deploy
  script: ./deploy.sh
  rules:
    - if: '$CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/'
      when: manual
      allow_failure: false
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
    - when: never
```

- `if`：基于 CI 变量/正则判断；`=~` 支持 `/regex/`。
- `changes`：文件变化时触发；**新分支上恒为 true**（没有比较基准），需要 `compare_to` 才能可靠比较。
- `exists`：指定文件存在时触发。
- `when`：`on_success`（默认）、`on_failure`、`always`、`manual`、`delayed`、`never`。
- `allow_failure`：允许失败；manual job 默认 `true`，可用 `allow_failure: false` 设为阻塞。
- `variables`：命中规则时覆盖变量。
- **有 `rules` 但全部不匹配 → job 不会被创建**；没有 `rules` 的 job 默认执行。
- **`rules` 不能与 `only/except` 在同一 job 混用**，否则配置报错。

#### 4.2.3 `only/except`（旧版）

```yaml
job:
  script: ./run.sh
  only:
    - main
    - merge_requests
    - tags
  except:
    - schedules
```

`only/except` 仍可用，但属于旧机制，表达能力和可读性都不如 `rules`。常见取值：`branches`、`tags`、`merge_requests`、`main`、`schedules`、`variables`（配合正则）。

| 维度 | `only/except` | `rules` |
| --- | --- | --- |
| 状态 | 旧版，仍兼容 | **推荐**，新项目唯一选择 |
| 表达能力 | refs / variables / changes | `if`、`changes`、`exists`、`variables`、`allow_failure`、`needs` |
| 匹配逻辑 | only 包含、except 排除 | 顺序求值，首个匹配生效 |
| 与 `workflow` 配合 | 不支持 | 支持，用于控制整条流水线 |
| 可读性 | 差，多条件易冲突 | 好，接近自然语言 |
| 迁移建议 | 逐步替换 | 新项目只用 `rules` |

### 4.3 `cache` 与 `artifacts`

#### Cache：加速，不保证

```yaml
default:
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - .npm/
    policy: pull-push
    when: on_success
```

- `key`：缓存标识；相同 key 的 job/pipeline 共享缓存。`key:files` 会根据 lockfile 内容计算哈希，依赖变更时自动换 key。
- `paths`：相对于 `CI_PROJECT_DIR` 的目录/文件。
- `policy`：`pull`（只读）、`push`（只写）、`pull-push`（默认）。
- `when`：`on_success`（默认）或 `always`。
- `fallback_keys`：主 key 未命中时尝试备用 key。
- 存储位置：Runner 本地 `/cache` 或对象存储（S3/MinIO/GCS/Azure）。**不同 Runner 的本地缓存不共享**。
- **缓存可能丢失、被覆盖、被清理，不能当交付物**；跨平台缓存（如 node_modules）还可能引入二进制不兼容问题。

#### Artifacts：交付与传递

```yaml
test:
  stage: test
  script:
    - npm test -- --coverage
  artifacts:
    when: always
    expire_in: 1 week
    paths:
      - coverage/
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

- `paths`：要上传的文件/目录；上传到 GitLab（或对象存储），可在 UI/API 下载。
- `expire_in`：保留时长；未设置时使用实例默认（常见 30 天）。
- `when`：`on_success`（默认）、`on_failure`、`always`；测试失败时用 `always` 保留现场。
- `reports`：结构化报告，GitLab 会解析并展示（JUnit、覆盖率、SAST、依赖扫描、代码质量等）。
- `expose_as`：在 MR 中直接展示单个文件。
- `access`：`all`（默认）或 `developer`（限制下载角色）。
- `dependencies`：限定下载哪些前序 job 的 artifacts；`needs` 会隐式下载所需 job 的 artifacts，`needs: []` 则不下载。

#### Cache vs Artifacts（必背）

| 维度 | **Cache** | **Artifacts** |
| --- | --- | --- |
| 目的 | 加速，复用依赖/编译中间产物 | 交付产物、测试报告、部署包 |
| 生命周期 | 可被覆盖/清理，**不保证存在** | 按 `expire_in` 保留，可下载 |
| 存储位置 | Runner 本地或对象存储 | GitLab 服务器/对象存储 |
| 作用范围 | 同一 key 的 job/pipeline | 同一 pipeline 的下游 job；可跨 pipeline 下载 |
| 是否保证存在 | 否 | 上传成功后即可用 |
| 典型内容 | npm/pip/maven 缓存、编译缓存 | 二进制、jar、dist、测试报告、覆盖率 |
| 关键配置 | `cache:key/paths/policy` | `artifacts:paths/expire_in/reports` |
| 失败时 | 通常不阻塞 | `when: always` 可保留失败现场 |
| 面向用户下载 | 不提供 | UI/API 可下载 |
| 误用后果 | 缓存污染、构建不可复现 | 存储膨胀、泄露敏感文件 |

**一句话记忆：cache 是“草稿纸”，artifacts 是“交付件”。**

### 4.4 `needs` 与 DAG

`needs` 让 job 不必等待整个 stage 完成，可以按依赖关系提前启动，形成 DAG：

```yaml
lint:
  stage: build
  script: npm run lint

build:
  stage: build
  script: npm run build
  artifacts:
    paths: [dist/]

test:
  stage: test
  needs: [build]        # 只等 build，不等 lint
  script: npm test
```

- `needs: []`：立即开始，不下载任何 artifacts。
- 同 stage 的 job 也可以互相 `needs`。
- `needs` 会下载被依赖 job 的 artifacts；若不想下载，用 `dependencies: []`。
- 循环依赖会直接报配置错误。
- `needs:project` 可跨项目取 artifacts（Premium 能力，视版本）。
- 使用 `needs` 后，stage 顺序只对未声明 `needs` 的 job 生效。

### 4.5 变量与预定义变量

#### 变量优先级（从高到低）

| 优先级 | 来源 | 说明 |
| --- | --- | --- |
| 1 | 流水线变量 | 手动运行、API、trigger 传入，最高 |
| 2 | 项目变量 | Settings → CI/CD → Variables |
| 3 | 群组变量 | 向下继承 |
| 4 | 实例变量 | 管理员配置 |
| 5 | dotenv 变量 | `artifacts:reports:dotenv` |
| 6 | Job YAML 变量 | `.gitlab-ci.yml` 中的 `variables` |
| 7 | 预定义变量 | `CI_*`，最低 |

> 注意：在 `script` 中 `export` 的变量会覆盖以上所有来源（运行时生效）；但不会自动传给下一个 job。

#### 常用预定义变量

| 变量 | 含义 | 可用场景 |
| --- | --- | --- |
| `CI_COMMIT_SHA` / `CI_COMMIT_SHORT_SHA` | 提交 SHA / 短 SHA | 所有流水线 |
| `CI_COMMIT_BRANCH` | 分支名 | **分支流水线**；MR/tag 流水线不可用 |
| `CI_COMMIT_TAG` | 标签名 | Tag 流水线 |
| `CI_DEFAULT_BRANCH` | 默认分支名 | 所有流水线 |
| `CI_PIPELINE_SOURCE` | 触发来源 | `push`、`merge_request_event`、`schedule`、`web`、`api`、`trigger`、`parent_pipeline` |
| `CI_MERGE_REQUEST_IID` | MR 内部编号 | 仅 MR 流水线 |
| `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME` | 源分支 | 仅 MR 流水线 |
| `CI_MERGE_REQUEST_TARGET_BRANCH_NAME` | 目标分支 | 仅 MR 流水线 |
| `CI_OPEN_MERGE_REQUESTS` | 当前分支关联的开放 MR | 分支流水线，用于去重 |
| `CI_PROJECT_DIR` | 仓库检出目录 | 所有 job |
| `CI_JOB_TOKEN` | job 专用令牌 | 拉取依赖、访问 API/Registry |
| `CI_REGISTRY_IMAGE` | 项目镜像仓库地址 | 构建/推送镜像 |
| `CI_ENVIRONMENT_NAME` | 环境名 | 部署 job |

**高频陷阱**：MR 流水线里 `CI_COMMIT_BRANCH` 是空的，不要用它判断分支；应使用 `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME` / `CI_MERGE_REQUEST_TARGET_BRANCH_NAME`。

#### 变量安全

- **Masked**：日志中自动脱敏；要求至少 8 个字符、单行、限定字符集。
- **Protected**：只在保护分支/标签的流水线中注入，防止 feature 分支窃取生产密钥。
- **Environment scope**：如 `production`、`staging`，实现环境隔离。
- 不要把密钥写进 `.gitlab-ci.yml` 或仓库；优先用外部密钥管理（Vault、云 Secrets Manager）或 OIDC 短期凭证。

### 4.6 `workflow` 与重复流水线

同一分支既有 push 又有 MR 时，可能同时触发分支流水线和 MR 流水线。用 `workflow:rules` 控制“是否创建流水线”：

```yaml
workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS'
      when: never
    - if: '$CI_COMMIT_BRANCH'
```

含义：

1. MR 事件：创建 MR 流水线。
2. 分支已有开放 MR：不再创建分支流水线（避免重复）。
3. 其他分支 push：正常创建分支流水线。

### 4.7 复用：`extends`、`include`、`!reference`

```yaml
.job_template:
  image: node:20-alpine
  before_script:
    - npm ci

test:
  extends: .job_template
  script: npm test
```

- `extends` 最多 11 层；**哈希合并，数组覆盖**（子级数组会整体替换父级数组，不会拼接）。
- `include` 支持 `local`、`remote`、`template`、`project`、`component`；包含的配置会合并，**当前文件优先**。
- `!reference` 可以精确引用数组项，解决 `extends` 数组覆盖的问题。
- `default` 定义全局默认值（image、cache、before_script 等），job 内可覆盖。
- YAML anchor（`&`/`*`）也能复用，但跨文件不如 `include` + `extends` 清晰。

### 4.8 完整示例

```yaml
stages: [build, test, package, deploy]

default:
  image: node:20-alpine
  cache:
    key:
      files: [package-lock.json]
    paths: [.npm/]
  before_script:
    - npm ci --cache .npm --prefer-offline

workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS'
      when: never
    - if: '$CI_COMMIT_BRANCH'

lint:
  stage: build
  script: npm run lint

test:
  stage: test
  script: npm test -- --coverage
  artifacts:
    when: always
    expire_in: 1 week
    paths: [coverage/]
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

package:
  stage: package
  needs: [test]
  script:
    - npm run build
    - tar czf dist.tar.gz dist
  artifacts:
    paths: [dist.tar.gz]
    expire_in: 1 month

deploy:staging:
  stage: deploy
  needs: [package]
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
  environment:
    name: staging
    url: https://staging.example.com
  script:
    - ./scripts/deploy.sh staging
```

**要点**：`default` 提供全局镜像与缓存；`workflow` 去重；`test` 用 `artifacts:when: always` 保留失败报告；`package` 只依赖 `test`；`deploy:staging` 仅在默认分支手动执行，并绑定 environment。

### 4.9 CI/CD 常见坑

- **重复流水线**：未配 `workflow:rules`，push 与 MR 各跑一遍。
- **`rules:changes` 在新分支恒为 true**：误以为能“只跑改动”，结果首次 push 全跑。
- **`only/except` 与 `rules` 混用**：配置直接报错。
- **`after_script` 失败不影响 job**：关键校验不要放这里。
- **缓存跨 Runner 不共享**：多 Runner 环境却只用本地 cache，命中率极低。
- **artifacts 未设过期**：存储持续膨胀；敏感文件被长期下载。
- **`needs` 与 `dependencies` 冲突**：以为会下载全部 artifacts，实际只下载 `needs` 指定的。
- **Protected 变量在 feature 分支为空**：不是变量丢了，而是被保护策略拦住。
- **MR 流水线取不到 `CI_COMMIT_BRANCH`**：改用 `CI_MERGE_REQUEST_*`。
- **浅克隆导致 `git describe` 失败**：默认 `GIT_DEPTH` 为 20，需要完整历史时设为 `0`。
- **部署 job 仍拉代码**：不需要仓库时用 `GIT_STRATEGY: none`，节省时间并降低泄露面。

### 真题

**真题 1**：`rules` 与 `only/except` 有什么区别？请写一段规则：只在 MR 和默认分支上运行，tag 上手动运行。

**解析**：

- `only/except` 是旧机制，按“包含/排除”匹配 refs/variables/changes；`rules` 是推荐机制，顺序求值、首个匹配生效，支持 `if`、`changes`、`exists`、`allow_failure`、`variables` 等。
- 两者不能在同一 job 混用；`rules` 可与 `workflow` 配合控制整条流水线。
- 示例：

```yaml
job:
  script: ./run.sh
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
    - if: '$CI_COMMIT_TAG'
      when: manual
    - when: never
```

- 加分点：`when: never` 兜底；manual job 默认 `allow_failure: true`，需要阻塞时显式设为 false。

**真题 2**：cache 和 artifacts 的区别是什么？一个 Node.js 项目应如何设计，既加速构建又能把测试报告和构建产物传给部署 job？

**解析**：

- cache 用于跨 pipeline 复用依赖，存储在 Runner 或对象存储，**不保证存在**；artifacts 用于交付和下游传递，上传到 GitLab，按 `expire_in` 保留、可下载。
- 依赖缓存：`cache:key:files: [package-lock.json]`，`paths: [.npm/]`，避免缓存 `node_modules` 带来的平台不一致。
- 测试报告：`artifacts:reports:junit` + `coverage_report`，配合 `when: always`。
- 构建产物：`artifacts:paths: [dist/]`，下游 `needs: [build]` 自动下载；部署 job 用 `needs` 精准依赖，避免下载无关产物。
- 加分点：cache 设 `policy: pull` 给只读 job；artifacts 设合理过期时间；大产物用对象存储并监控容量。

## 五、GitLab Runner

> **一句话结论：Runner 是主动拉取 job 的执行代理；Docker Executor 用“helper 准备 + 业务容器执行 + helper 上传”完成一次 job。**

### 5.1 Runner 类型与调度

| 类型 | 归属 | 谁能管理 | 典型用途 |
| --- | --- | --- | --- |
| **Instance Runner**（共享 Runner） | 整个实例 | 管理员 | 通用构建、成本分摊 |
| **Group Runner** | 某个群组 | 群组 Owner/Maintainer | 团队共享，隔离度中等 |
| **Project Runner**（专用 Runner） | 单个项目 | 项目 Maintainer | 特殊依赖、生产部署 |

其他关键属性：

- **Shared vs Specific**：共享 Runner 对所有项目开放；专用 Runner 只服务指定项目/群组。
- **Protected Runner**：只执行**保护分支/保护标签**上的 job，防止 feature 分支拿到生产部署权限。
- **Tag**：job 的 `tags` 必须与 Runner 标签**全部匹配**（AND 关系）；没有 tag 的 job 需要 Runner 开启 `run_untagged`。
- **Paused**：暂停后不再领取新 job；**Locked**：禁止其他项目使用。
- **并发**：`concurrent` 控制 Runner 全局并发，`limit` 控制单个 Runner 的并发；job 还会受项目/实例配额限制。

Runner 只需**出站 HTTPS** 访问 GitLab，不需要入站端口；它通过长轮询（long polling）领取 job，因此防火墙通常只需放行 443。

### 5.2 注册方式

**新流程（GitLab 16+ 推荐，17.0 起注册令牌已移除）**：

1. 在 **Settings → CI/CD → Runners → New project runner**（或群组/管理员页面）创建 Runner。
2. 选择操作系统、标签、是否运行未打标签 job、是否 protected。
3. 创建后获得 **认证令牌**（`glrt-` 开头，只显示一次）。
4. 在 Runner 主机执行注册：

```bash
gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.example.com" \
  --token "glrt-xxxxxxxxxxxxxxxx" \
  --executor "docker" \
  --docker-image "alpine:3.20" \
  --description "docker-runner-01" \
  --tag-list "docker,linux,staging"
```

5. 验证：`gitlab-runner verify`、`gitlab-runner list`；在 GitLab UI 中确认 Runner 为 online。

**旧流程（仅用于理解存量环境）**：使用 registration token + `--registration-token` 注册。该方式在 16.x 已弃用、17.0 起移除；看到旧文档时不要照抄到新实例。

**配置文件位置**：

| 平台 | 路径 |
| --- | --- |
| Linux（包安装） | `/etc/gitlab-runner/config.toml` |
| Docker 容器 | `/etc/gitlab-runner/config.toml`（需挂载） |
| Windows | `C:\GitLab-Runner\config.toml` |

**常用命令**：

```bash
gitlab-runner verify                 # 校验令牌与连通性
gitlab-runner list                   # 列出已注册 Runner
gitlab-runner run --debug            # 前台调试
gitlab-runner restart                # 重启服务
systemctl status gitlab-runner       # 查看服务状态
```

### 5.3 `config.toml` 核心配置

```toml
concurrent = 8
check_interval = 3

[[runners]]
  name = "docker-runner-01"
  url = "https://gitlab.example.com"
  token = "glrt-xxxxxxxxxxxxxxxx"
  executor = "docker"
  limit = 4
  tags = ["docker", "linux", "staging"]
  run_untagged = false

  [runners.docker]
    image = "alpine:3.20"
    privileged = false
    volumes = ["/cache", "/builds:/builds"]
    network_mode = "bridge"
    pull_policy = "if-not-present"
    shm_size = 0

  [runners.cache]
    Type = "s3"
    Shared = true
    ServerAddress = "s3.example.com"
    BucketName = "gitlab-runner-cache"
    AccessKey = "xxx"
    SecretKey = "yyy"
    Insecure = false
```

| 配置 | 作用 | 注意 |
| --- | --- | --- |
| `concurrent` | Runner 全局并发 job 数 | 受 CPU/内存/磁盘限制 |
| `check_interval` | 轮询间隔（秒） | 太大导致 job 延迟，太小增加 API 压力 |
| `limit` | 单 Runner 并发上限 | 防止单个 Runner 吃满资源 |
| `executor` | 执行器类型 | docker / shell / kubernetes / docker-autoscaler |
| `tags` | 标签 | 与 job `tags` 做 AND 匹配 |
| `run_untagged` | 是否接无标签 job | 共享 Runner 常设 false，避免误接 |
| `[runners.docker] image` | 默认镜像 | job 可用 `image` 覆盖 |
| `privileged` | 特权模式 | DinD 需要；生产慎用 |
| `volumes` | 挂载 | `/cache` 用于本地缓存，`/builds` 持久化工作区 |
| `pull_policy` | 拉镜像策略 | always / if-not-present / never |
| `shm_size` | 共享内存 | 浏览器测试常需调大（如 2g） |
| `[runners.cache]` | 分布式缓存 | S3/MinIO/GCS/Azure；多 Runner 必配 |

### 5.4 Docker Executor 工作原理（面试高频）

一次 job 的完整生命周期：

1. **领取 job**：Runner 进程通过 HTTPS 长轮询 `POST /api/v4/jobs/request`，携带 Runner 认证令牌；GitLab 返回 job JSON（镜像、脚本、变量、services、cache、artifacts 配置）。
2. **准备网络与容器**：为本次 job 创建独立 Docker network；准备服务容器（如 PostgreSQL、Redis）。
3. **Prepare 阶段（helper 容器）**：使用与 Runner 版本匹配的 **helper image**（`gitlab-runner-helper`）挂载 `/builds` 与 `/cache`，执行 `git clone/fetch`，检出 `CI_COMMIT_SHA`，并恢复 cache。默认 `GIT_STRATEGY=fetch`、`GIT_DEPTH=20`（浅克隆）。
4. **启动 services**：按 `services:` 启动容器，加入同一网络，并以其别名作为 hostname；Runner 等待服务端口就绪。
5. **启动业务容器**：拉取 job 的 `image`，挂载 `/builds/<namespace>/<project>` 与 `/cache`，注入 CI 变量，设置工作目录；执行 `before_script` + `script`（拼接为同一 shell 脚本），实时上传日志。
6. **执行 `after_script`**：在业务容器内用**新的 shell** 执行，失败不影响 job 状态。
7. **Post 阶段（helper 容器）**：收集 cache、上传 artifacts 到 GitLab（使用 `CI_JOB_TOKEN`）；即使 job 失败，`when: always` 的 artifacts 也会上传。
8. **清理**：停止并删除业务容器、服务容器、网络（可配置保留）；Runner 上报最终状态。

**关键理解**：

- **helper 容器负责“准备”和“收尾”**，业务容器只负责跑脚本；helper 镜像版本必须与 Runner 匹配。
- **`/builds` 挂载在宿主机**，所以同一 Runner 上的 job 可以复用工作区；并发 job 使用不同子目录。
- **服务容器的 hostname 是 service 别名**，不是 `localhost`；job 容器里的 `localhost` 指向 job 容器自身。
- **Docker socket 不是默认挂载的**；需要构建镜像时必须显式配置 DinD 或挂载 socket。

**DinD vs Docker Socket Binding**：

| 方式 | 原理 | 优点 | 风险/成本 |
| --- | --- | --- | --- |
| **Docker-in-Docker（DinD）** | 在 job 容器内再启动一个 Docker daemon，需要 `privileged = true` | 隔离较好，不暴露宿主机 Docker | 特权容器、内核/存储驱动兼容性、性能开销 |
| **Socket Binding** | 把宿主机 `/var/run/docker.sock` 挂进 job 容器 | 简单、快、无需 DinD | **等于把宿主机 root 权限交给 job**，恶意代码可控制宿主机 |
| **Rootless / Kaniko / Buildah** | 无守护进程构建镜像 | 安全性更好 | 工具链适配、缓存与权限差异 |

**生产建议**：Runner 部署在专用主机/专用节点；默认 `privileged=false`；只有明确需要镜像构建的 Runner 才开特权，并限制可用项目；不要让不可信 MR 在特权 Runner 上运行。

### 5.5 常见故障排查

| 现象 | 常见原因 | 处理 |
| --- | --- | --- |
| job 一直 pending，提示 no runners | 无 Runner、Runner paused、标签不匹配 | 检查 Runner online/标签/`run_untagged` |
| 保护分支 job 不被领取 | Runner 是 protected，但分支未保护（或反之） | 调整 protected 设置 |
| `Cannot connect to the Docker daemon` | Runner 用户无 docker 权限、socket 路径错误 | 加入 docker 组，重启 Runner |
| `permission denied` 写 `/builds` | 宿主机目录属主与容器 UID 不一致 | 调整目录权限/`builds_dir` |
| TLS 证书错误 | 自签 CA 未安装 | 将 CA 放入系统信任或 `tls-ca-file` |
| `No space left on device` | 镜像/容器/缓存占满磁盘 | `docker system prune`、清理 `/cache`、监控磁盘 |
| 缓存不命中 | key 变化、Runner 不同、policy=pull | 统一 key、配置共享对象存储 |
| artifacts 上传失败 | 体积超限、对象存储配置错误 | 设过期时间、检查 S3 权限/配额 |
| exit code 137 | OOM 被杀 | 提高内存限制、优化构建 |
| 私有依赖拉取失败 | 缺少凭证/`CI_JOB_TOKEN` 权限 | 配置 deploy token 或变量 |

**排查顺序**：GitLab UI job 日志 → Runner 日志（`journalctl -u gitlab-runner`）→ `gitlab-runner run --debug` → Docker 事件/磁盘 → 网络与证书。

### 真题

**真题 1**：请描述 GitLab Runner 的 Docker Executor 从领取 job 到上传产物的完整流程。

**解析**：

- Runner 通过 HTTPS 长轮询领取 job，拿到镜像、脚本、变量、services、cache/artifacts 配置。
- 创建 job 网络；helper 容器挂载 `/builds`、`/cache`，克隆仓库、检出 SHA、恢复缓存。
- 启动 services 容器并等待端口就绪；启动业务容器，挂载工作区，执行 `before_script` + `script`。
- `after_script` 用新 shell 执行；helper 容器收集缓存、上传 artifacts；清理容器与网络并上报状态。
- 加分点：helper 镜像版本需匹配；`/builds` 在宿主机；服务用别名访问；DinD 与 socket binding 的安全差异。

**真题 2**：某个 job 一直处于 pending，提示 “This job is stuck because you don't have any runners online assigned to this project”。你会如何排查？

**解析**：

- 看 job 的 `tags` 与可用 Runner 标签是否完全匹配；检查 Runner 是否 paused、是否 offline。
- 检查 Runner 的 `run_untagged`：job 无 tags 时，只有允许 untagged 的 Runner 才会接。
- 检查是否 protected Runner + 非保护分支，或项目/群组 Runner 未启用。
- 检查 Runner 的 `limit`/`concurrent` 是否已满，以及项目是否被配额限制。
- 加分点：`gitlab-runner verify`、UI Runner 页面、Runner 日志、`gitlab-runner run --debug`；修复后重试 pipeline。

## 六、运维与安全

> **一句话结论：备份要“数据 + 配置 + 密钥”三件套；Webhook 是至少一次投递，接收端必须幂等。**

### 6.1 组件与请求链路

```text
用户/CI → Nginx（80/443）→ GitLab Workhorse → Puma（Rails）
                                      ├── PostgreSQL（元数据）
                                      ├── Redis（缓存/队列）
                                      ├── Gitaly（Git 仓库）
                                      └── Sidekiq（异步任务）
```

| 组件 | 作用 | 排障关注点 |
| --- | --- | --- |
| **Nginx** | TLS 终止、反向代理、静态资源 | 502/504、证书、上游超时 |
| **GitLab Workhorse** | 大文件上传、Git HTTP、WebSocket | 上传失败、git clone 慢 |
| **Puma** | Rails 应用进程 | 500、内存、worker 数 |
| **Sidekiq** | 异步任务（邮件、导入、清理） | 队列积压、内存、死信 |
| **PostgreSQL** | 用户、项目、MR、CI 元数据 | 连接数、慢查询、磁盘 |
| **Redis** | 缓存、会话、Sidekiq 队列 | 内存、eviction、连接 |
| **Gitaly** | Git 仓库读写服务 | 仓库损坏、磁盘、超时 |
| **Registry / Pages / KAS** | 镜像、静态站点、K8s Agent | 存储、证书、域名 |

**目录约定**：

| 路径 | 内容 |
| --- | --- |
| `/etc/gitlab` | `gitlab.rb`、`gitlab-secrets.json`、证书 |
| `/var/opt/gitlab` | 数据：仓库、数据库、上传、artifacts、registry |
| `/var/log/gitlab` | 各组件日志 |
| `/opt/gitlab` | 安装文件与 `gitlab-ctl` |

**重要原则**：只改 `/etc/gitlab/gitlab.rb`，然后 `gitlab-ctl reconfigure`；**不要手工编辑 `/var/opt/gitlab` 下的生成配置**，否则下次 reconfigure 会被覆盖。

### 6.2 备份机制

**命令**：

```bash
# 新版推荐
sudo gitlab-backup create

# 旧版/兼容写法
sudo gitlab-rake gitlab:backup:create
```

默认输出目录：`/var/opt/gitlab/backups/`，文件名形如：

```text
1700000000_2026_11_19_18.5.0_gitlab_backup.tar
```

**备份包含的内容（本地存储时）**：

- PostgreSQL 数据库（用户、项目、Issue、MR、CI 元数据等）
- Git 仓库（通过 Gitaly）
- 用户上传（avatars、附件）
- CI job 日志、artifacts
- Git LFS 对象
- GitLab Pages 内容
- Packages 包
- Terraform state 等（视版本）
- 本地磁盘上的 Container Registry 数据（以版本文档与存储配置为准）

**备份不包含 / 需要单独处理**：

| 内容 | 原因 | 处理方式 |
| --- | --- | --- |
| `/etc/gitlab/gitlab.rb` | 配置文件不在备份包内 | 单独打包/版本化管理 |
| `/etc/gitlab/gitlab-secrets.json` | 包含 `db_key_base`、`secret_key_base` 等 | **必须单独备份并加密**，丢失后 CI 变量、2FA、令牌可能无法解密 |
| SSH host keys | 主机身份 | 单独备份或重建后更新 known_hosts |
| Redis 数据 | 缓存/队列，可重建 | 通常无需备份 |
| 外部对象存储中的数据 | tar 不会打包 S3/GCS 中的对象 | 开启版本控制/跨区域复制，单独制定备份策略 |
| 外部数据库 | 不在本地磁盘 | 使用数据库原生备份（pg_dump/快照） |

**常用参数**：

```bash
# 跳过体积大或可重建的部分
sudo gitlab-backup create SKIP=builds,artifacts,registry

# 指定备份路径/保留时间（写在 gitlab.rb）
gitlab_rails['backup_path'] = "/data/backups"
gitlab_rails['backup_keep_time'] = 604800   # 7 天；0 表示永久保留
```

**定时备份**（示例）：

```cron
0 2 * * * root /opt/gitlab/bin/gitlab-backup create CRON=1
```

**备份策略**：

- 遵循 **3-2-1**：3 份副本、2 种介质、1 份异地。
- 备份文件**加密**后传输/存储；限制访问权限。
- 监控备份任务与文件大小；**没有做过恢复演练的备份不算备份**。
- 明确 **RPO/RTO**：备份频率决定 RPO，恢复演练决定 RTO。
- **Geo 不是备份**：Geo 是跨区域复制，误删会同步到从节点；仍需独立逻辑备份。

### 6.3 恢复机制

**前提**：

- 目标实例与备份**同版本、同 edition**（CE/EE）最稳妥；跨版本恢复不被支持。
- 准备相同的 `external_url`、对象存储、数据库配置。
- 磁盘空间至少能容纳解压后的数据。

**步骤**：

1. 安装同版本 GitLab，停止不必要的写入。
2. 恢复配置与密钥：

```bash
# 将备份的 gitlab.rb、gitlab-secrets.json 放回 /etc/gitlab
sudo gitlab-ctl reconfigure
```

3. 停止写入数据库的服务：

```bash
sudo gitlab-ctl stop puma
sudo gitlab-ctl stop sidekiq
sudo gitlab-ctl status
```

4. 将备份 tar 放入 `/var/opt/gitlab/backups/`，确保属主为 `git`：

```bash
sudo chown git:git /var/opt/gitlab/backups/<backup>.tar
```

5. 执行恢复（`BACKUP=` 不需要 `_gitlab_backup.tar` 后缀）：

```bash
sudo gitlab-backup restore BACKUP=<timestamp>_<version>
```

6. 重新配置并重启：

```bash
sudo gitlab-ctl reconfigure
sudo gitlab-ctl restart
sudo gitlab-rake gitlab:check SANITIZE=true
```

7. **验证**：登录、仓库 clone、MR、CI 变量（能否解密）、Runner、Registry、Pages、Webhook、2FA。

**常见坑**：

- **只恢复了 tar，没恢复 `gitlab-secrets.json`**：出现 500、CI 变量为空、2FA 失效、令牌无法解密。
- **版本不一致**：恢复失败或数据损坏；先升级/降级到同版本。
- **恢复时未停 Puma/Sidekiq**：后台任务写入导致数据不一致。
- **对象存储没配好**：数据库恢复了，但 artifacts/upload 404。
- **权限/属主错误**：`git` 用户无法读写备份或仓库。
- **恢复后没有跑 `gitlab:check`**：遗漏数据库迁移、Gitaly 连通性等问题。

### 6.4 常用运维命令 `gitlab-ctl`

| 命令 | 作用 | 典型场景 |
| --- | --- | --- |
| `gitlab-ctl status` | 查看各服务状态 | 500/502 第一步 |
| `gitlab-ctl start / stop / restart [service]` | 启停服务 | 单服务重启，如 `restart nginx` |
| `gitlab-ctl reconfigure` | 重新生成配置并重启受影响服务 | 修改 `gitlab.rb` 后必做 |
| `gitlab-ctl tail [service]` | 实时跟踪日志 | 排障首选，如 `tail gitlab-rails` |
| `gitlab-ctl service-list` | 列出所有服务 | 确认组件清单 |
| `gitlab-ctl deploy-page up / down` | 开启/关闭维护页 | 停机升级 |
| `gitlab-ctl pg-upgrade` | 升级内置 PostgreSQL | 大版本升级前先备份 |
| `gitlab-rake gitlab:check SANITIZE=true` | 健康检查 | 恢复/升级后验证 |
| `gitlab-rake gitlab:env:info` | 输出环境信息 | 提工单/排障 |
| `gitlab-rails console -e production` | Rails 控制台 | 应急查数据（谨慎） |
| `gitlab-psql` | 进入 PostgreSQL | 查慢查询/元数据 |
| `gitlab-redis-cli` | 进入 Redis CLI | 查队列/内存 |

**`reconfigure` vs `restart`**：

- `reconfigure`：根据 `gitlab.rb` 重新生成配置，并重启配置发生变化的服务，**改配置后用它**。
- `restart`：只重启进程，不重新生成配置；适合进程异常但配置没变。
- 单服务操作：`gitlab-ctl restart nginx`、`gitlab-ctl status sidekiq`。

**日志位置**：`/var/log/gitlab/<service>/`；`gitlab-ctl tail` 会聚合跟随。常见文件：`nginx/gitlab_access.log`、`gitlab-rails/production.log`、`gitlab-rails/production_json.log`、`sidekiq/current`、`gitaly/current`。

### 6.5 升级、HA 与可观测性

**升级流程**：

1. 阅读 release notes 与 **升级路径**（大版本可能需要先升到指定补丁版本）。
2. **完整备份** + 验证备份可读；准备回滚方案（快照/恢复）。
3. 公告维护窗口；单节点可使用维护页。
4. 安装目标版本（如 `apt-get install gitlab-ee=<version>`）。
5. `gitlab-ctl reconfigure` → `gitlab-ctl restart`。
6. 检查 `gitlab-ctl status`、`gitlab-rake gitlab:check`、登录/CI/Registry。
7. 观察后台迁移、Sidekiq 队列、错误日志；确认后再关闭维护窗口。

**注意**：GitLab **不支持直接降级**；回滚通常依赖备份恢复或虚拟机快照。生产升级前先在预发环境演练。

**高可用（HA）要点**：

- **PostgreSQL**：主从复制 + 故障切换（Patroni 等）。
- **Redis**：Sentinel 或集群模式。
- **Gitaly**：Gitaly Cluster（Praefect）提供副本与一致性。
- **Puma/Workhorse/Nginx**：多节点 + 负载均衡。
- **对象存储**：artifacts、uploads、LFS、Registry 外置到 S3/MinIO。
- **Geo**（Premium）：跨区域只读副本，用于灾备/就近访问，但**不是备份**。

**健康检查端点**：

| 端点 | 作用 |
| --- | --- |
| `/-/health` | Rails 应用存活 |
| `/-/readiness` | 依赖（DB、Redis、Gitaly 等）就绪 |
| `/-/liveness` | 进程存活 |
| `/metrics` | Prometheus 指标（需配置访问控制） |

**监控重点**：HTTP 5xx、Puma worker、Sidekiq 队列/死信、PostgreSQL 连接与慢查询、Redis 内存/eviction、Gitaly 延迟、磁盘水位、备份成功率、Runner 队列时长。

### 6.6 Webhook 的使用与治理

**Webhook** 是 GitLab 在事件发生时向外部 URL 发送的 HTTP POST 回调，分为：

- **Project Webhook**：只针对单个项目。
- **Group Webhook**：覆盖群组内所有项目。
- **System Hook**：实例级，管理员配置。

**常用事件**：

| 事件 | `object_kind` | 典型用途 |
| --- | --- | --- |
| Push | `push` | 触发构建、同步代码、通知 |
| Tag push | `tag_push` | 发布流水线、制品归档 |
| Merge Request | `merge_request` | 审批提醒、代码扫描、看板同步 |
| Pipeline | `pipeline` | 通知失败、更新部署状态 |
| Job | `job` | 细粒度构建通知 |
| Deployment | `deployment` | 发布记录、变更审计 |
| Release | `release` | 发布通知、文档更新 |
| Issue / Note | `issue` / `note` | 工单同步、聊天机器人 |

**请求特征**：

```http
POST /your-endpoint HTTP/1.1
Content-Type: application/json
X-Gitlab-Event: Merge Request Hook
X-Gitlab-Token: <secret-token>
X-Gitlab-Event-UUID: <uuid>        # 新版本提供，可用于幂等
```

- **Secret Token**：创建 Webhook 时配置，GitLab 通过 `X-Gitlab-Token` 发送；接收端应使用**常量时间比较**，不要用普通字符串比较。
- **签名令牌**（新版本）：支持 HMAC-SHA256 签名，接收端用共享密钥校验 `webhook-signature`，比明文 token 更安全。
- **SSRF 防护**：默认禁止访问 localhost/内网地址；如需回调内网，管理员需在 **Admin → Settings → Network → Outbound requests** 中放行（谨慎评估）。
- **超时**：GitLab 等待响应约 10 秒；接收端应快速返回 2xx，把重活丢到队列。
- **重试**：失败会重试（新版本支持指数退避），属于**至少一次投递**，可能重复、乱序；接收端必须**幂等**。
- **分支过滤**：Project Webhook 可配置 branch filter（通配符），减少无关 push 事件。
- **SSL 验证**：默认开启；自签证书需要正确配置 CA，不要长期关闭验证。

**可靠性设计**：

1. 接收端先落库/入队，立即返回 2xx；异步处理。
2. 用 `X-Gitlab-Event-UUID` 或业务唯一键（MR IID + action + SHA）做去重。
3. 处理失败进入重试队列 + 死信队列；告警。
4. 校验来源（token/签名/IP allowlist）并限制请求体大小。
5. 记录请求头、payload 摘要、响应码与耗时，便于排障。
6. 对乱序事件做状态机保护（例如旧 pipeline 状态不能覆盖新状态）。

**排障**：

- 项目 **Settings → Webhooks → Recent events** 查看请求/响应；可用 “Test” 发送样例。
- 检查 URL 是否被 SSRF 拦截、DNS/防火墙、TLS 证书、超时。
- GitLab 日志：`gitlab-ctl tail gitlab-rails`，关注 `production_json.log` 中的 webhook 请求。
- 接收端先确认能收到请求，再排查业务处理；不要只看 GitLab 侧状态。

**Webhook vs CI Trigger vs API**：

| 机制 | 方向 | 用途 | 是否适合重活 |
| --- | --- | --- | --- |
| **Webhook** | GitLab → 外部 | 事件通知、联动 | 否，应快速返回 |
| **Pipeline Trigger API** | 外部 → GitLab | 外部系统触发流水线 | 是，由 Runner 执行 |
| **REST API** | 双向 | 查询/修改资源 | 视场景 |

### 6.7 安全加固清单

- **传输与认证**：全站 HTTPS/HSTS；强制 2FA；SSH key 与 PAT 设置过期时间；禁止共享账号。
- **权限**：最小权限；保护分支/标签；生产环境使用 Protected environment；定期审计成员与 Token。
- **代码门禁**：push rules（签名、commit 规范、密钥扫描，Premium）；MR approval + Code Owners；禁止跳过流水线。
- **CI/CD**：变量 Masked + Protected + 环境隔离；密钥放 Vault/云 Secrets Manager；`CI_JOB_TOKEN` allowlist；Fork MR 流水线需批准；不可信代码不要跑在特权 Runner。
- **Runner**：专用主机/节点；非 root；默认 `privileged=false`；限制可用镜像；网络策略；令牌轮换；及时升级。
- **Webhook**：HTTPS + secret/signature；最小事件集；内网访问白名单；幂等与限流。
- **数据**：备份加密、异地保存、定期恢复演练；对象存储开启版本控制；Registry 清理策略。
- **运维**：及时打安全补丁；限制 `gitlab-rails console`/服务器 SSH 权限；日志集中与告警；审计事件留存（Premium）。
- **边界**：防火墙只暴露 80/443 与必要 SSH；管理端口不对外；IP allowlist；Rate limit/fail2ban。

### 真题

**真题 1**：为什么只备份 `gitlab-backup` 生成的 tar 包不够？请描述一次完整的恢复流程和常见坑。

**解析**：

- tar 包不包含 `/etc/gitlab/gitlab.rb` 与 `gitlab-secrets.json`；后者包含数据库/会话/CI 变量加密密钥，丢失会导致 500、变量无法解密、2FA 失效。
- 还需单独处理外部对象存储、外部数据库、SSH host keys；Geo 不是备份。
- 恢复：安装同版本 → 恢复配置与 secrets → `reconfigure` → 停 Puma/Sidekiq → 放入备份 tar 并修正属主 → `gitlab-backup restore BACKUP=...` → `reconfigure` + `restart` → `gitlab:check` → 业务验证。
- 常见坑：版本不一致、未停写入服务、对象存储未配置、权限错误、恢复后未验证。
- 加分点：3-2-1、加密、定期演练、RPO/RTO、监控备份任务。

**真题 2**：Webhook 偶发超时、重复和乱序，如何设计接收端？如何确认请求来自 GitLab？

**解析**：

- 快速返回 2xx，业务异步化；设置幂等键（`X-Gitlab-Event-UUID` 或业务唯一键）去重；状态机防旧事件覆盖新状态。
- 超时：接收端限流、拆分大 payload、异步队列；GitLab 侧重试会放大流量，需要背压与死信队列。
- 来源校验：`X-Gitlab-Token` 常量时间比较；新版本用 HMAC 签名校验；配合 HTTPS、IP allowlist、请求体大小限制。
- 排障：Recent events、`gitlab-ctl tail gitlab-rails`、接收端访问日志；先用 Test 事件验证链路。
- 加分点：Webhook 是至少一次投递，不是消息队列；关键业务应有对账/补偿任务。

## 七、考前速记与自测清单

### 7.1 默认值与数字

| 项目 | 默认值/常见值 | 备注 |
| --- | --- | --- |
| 默认 stage | `.pre → build → test → deploy → .post` | job 未写 `stage` 时进入 `test` |
| 默认分支保护 | 默认分支自动保护 | Maintainer 可 push/merge，force push 关闭 |
| 子组最大嵌套 | 20 层 | 实例可调 |
| CI 克隆深度 | `GIT_DEPTH=20` | 需要完整历史设为 0 |
| Artifacts 默认保留 | 实例默认，常见 30 天 | 建议显式 `expire_in` |
| Job 默认超时 | 常见 60 分钟 | 项目可调 |
| Webhook 超时 | 约 10 秒 | 接收端必须快速返回 |
| Runner 并发 | `concurrent` 默认 1 | 生产按资源调大 |
| 备份保留 | `backup_keep_time=0` | 0 表示不自动删除 |
| 备份目录 | `/var/opt/gitlab/backups` | 注意磁盘与权限 |
| 主要端口 | 80/443、22 | Runner 只需出站 443 |

### 7.2 易错点 TOP 10

1. **rebase 时 `ours/theirs` 反转**：ours 是基底，theirs 是你的提交。
2. **对公共分支 rebase**：改写历史，协作者会崩溃；公共分支用 merge/revert。
3. **Developer 默认不能合并保护分支**：Allowed to merge 默认 Maintainers。
4. **Guest 看不到私有项目代码**：Reporter 才能 clone/下载 artifacts。
5. **`rules` 与 `only/except` 不能混用**；新项目只用 `rules`。
6. **`rules:changes` 在新分支恒为 true**：不是“只跑改动”。
7. **cache 不是 artifacts**：cache 不保证存在，不能当交付物。
8. **MR 流水线没有 `CI_COMMIT_BRANCH`**：用 `CI_MERGE_REQUEST_*`。
9. **备份 tar 不含 `gitlab-secrets.json`**：只恢复 tar 会 500/变量失效。
10. **Webhook 是至少一次投递**：重复、乱序、超时都要在接收端处理。

### 7.3 命令速查

| 场景 | 命令 |
| --- | --- |
| 查看提交图 | `git log --graph --oneline --decorate --all` |
| 同步主干并线性化 | `git fetch origin && git rebase origin/main` |
| 安全强推 | `git push --force-with-lease` |
| 撤销已推送提交 | `git revert <sha>` |
| 拣选到发布分支 | `git cherry-pick <sha>` |
| 找回 reset 的提交 | `git reflog` |
| 冲突文件列表 | `git diff --name-only --diff-filter=U` |
| 放弃 rebase | `git rebase --abort` |
| 创建 MR 的 push option | `git push -o merge_request.create` |
| 创建备份 | `sudo gitlab-backup create` |
| 恢复备份 | `sudo gitlab-backup restore BACKUP=<timestamp>_<version>` |
| 健康检查 | `sudo gitlab-rake gitlab:check SANITIZE=true` |
| 看服务状态 | `sudo gitlab-ctl status` |
| 跟踪日志 | `sudo gitlab-ctl tail` |
| 重载配置 | `sudo gitlab-ctl reconfigure` |
| 维护页 | `sudo gitlab-ctl deploy-page up` |
| Runner 校验 | `gitlab-runner verify` |
| Runner 调试 | `gitlab-runner run --debug` |

### 7.4 面试答题模板

**“区别类”问题**（merge/rebase、cache/artifacts、only/rules）：

1. 一句话定义各自是什么。
2. 从“作用范围、生命周期、存储位置、是否改写、风险”列维度对比。
3. 给出适用场景与反例。
4. 补充一个工程实践或踩坑。

**“排障类”问题**（job pending、500、Webhook 失败）：

1. 先界定影响面：单项目/全实例、单 job/全流水线。
2. 按链路排查：UI 状态 → 组件状态 → 日志 → 依赖（DB/Redis/Gitaly/磁盘/网络）。
3. 给出临时止损（重试、切流、维护页）与根因修复。
4. 补监控/告警/演练，防止复发。

**“设计类”问题**（权限、CI、备份）：

1. 明确目标与约束（合规、RPO/RTO、团队规模）。
2. 分层设计：Group/Project、保护分支、环境、Runner、变量。
3. 说明默认拒绝与最小权限。
4. 给出验证与审计手段。

### 7.5 自测清单

- [ ] 能画出 merge 与 rebase 的历史图，并解释 SHA 变化。
- [ ] 能说出 rebase 冲突时 `ours/theirs` 分别指什么。
- [ ] 能解释 Group/Subgroup/Project 的继承与可见性限制。
- [ ] 能背出 Guest/Reporter/Developer/Maintainer/Owner 的能力边界。
- [ ] 能独立配置“main 只能 MR 合入 + 流水线必须通过 + 至少一人审批”。
- [ ] 能写出 `rules` 的 MR/默认分支/tag 三种场景。
- [ ] 能用表格说清 cache 与 artifacts 的差异。
- [ ] 能解释 `needs` 如何打破 stage 顺序，以及 artifacts 如何传递。
- [ ] 能描述 Docker Executor 的 prepare/build/post 三阶段。
- [ ] 能说出 Runner 注册的新旧流程与 `glrt-` 令牌。
- [ ] 能完整说出备份包含/不包含什么，以及恢复步骤。
- [ ] 能解释为什么 `gitlab-secrets.json` 比 tar 还关键。
- [ ] 能设计幂等、可重试、可观测的 Webhook 接收端。
- [ ] 能列出至少 8 条 GitLab 安全加固措施。

---

**最后提醒**：笔试中遇到不确定的默认值，先写“默认/可配置”并说明验证方法，比硬编一个错误数字更安全；面试中把“为什么这样做”和“出了问题怎么止损”讲清楚，通常比背命令更加分。

<!-- END -->
