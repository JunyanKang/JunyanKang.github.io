# 网站内容管理

## 登录管理

网站页脚 **Admin** 直接打开 https://app.pagescms.org/sign-in 邮箱登录，不再经过网站内的管理介绍页。编辑器在 Pages CMS 托管后台打开，不是在 kanglab.cool 内收集密码。日常维护者用获邀邮箱登录，不需要 GitHub 账号；不开放任意邮箱自行注册为管理员。

### 仅首次：仓库所有者连接

1. 在 https://app.pagescms.org/ 用仓库所有者的 GitHub 身份登录。
2. 安装 / 授权 Pages CMS GitHub App，**仅选择 JunyanKang.github.io**，不要授权所有仓库。
3. 打开该仓库的 main 分支，后台会读取已提供的 .pages.yml 表单配置。
4. 在 Collaborators 中邀请日常管理所用的邮箱。可使用 kangjunyan@outlook.com，也可选择另一个由你本人控制的邮箱。
5. 退出所有者会话，通过邀请邮件进入并验证邮箱登录。确认能看到 Team、Publications、Software 和 Contact 四个表单后，邮箱后台才算正式开通。

以上邀请保存在 Pages CMS 服务端数据库，**不是在 .pages.yml 里填写邮箱就完成授权**。在所有者授权和邮箱验证完成前，网站只有入口与表单配置，尚未启用邮箱写入权限。

### 日常编辑

受邀邮箱可以编辑内容和上传图片，不能管理后台配置、邀请其他协作者或访问缓存管理功能。需要撤销编辑权限时，由所有者在 Collaborators 中移除邮箱。

无需向本站提供 GitHub 密码或个人令牌，也没有前端硬编码的管理员密码。管理链接公开，但编辑权限由托管后台校验。首次仓库授权和日常邮箱登录是两件不同的事。

## 成员、照片和地图

编辑 **成员与照片 / Team**：姓名、入学年份、培养类型、显示分组、籍贯省份、籍贯文字、照片和简介。将 Display group 改为 **Alumni / 毕业生** 即可转入毕业生分组，原照片与简介保留；可填写 Graduation year（毕业年份），不填也能保存。新增成员后省级地图计数自动更新。

**上传成员头像**：在 Team 中点击对应成员姓名展开，在姓名后的 **头像照片 / Member photo** 点击上传或从 Media 选择。上传后仍需点击右上角 **Save** 保存成员记录；仅上传到 Media 不会自动绑定成员。更换和移除照片也在此处完成。照片是可选项，不影响无照片成员的显示。

公开数据不含导师和性别，原始名单截图不会上传。地图是籍贯分布，不是现在的工作地点；只提供省份的成员不会被假定到某一城市。成员数据文件 `_data/team.json`、照片 `assets/img/team/`。

地图数据来源：[DataV GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector)，获取于 2026-09-29，原始路径 `https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json`。源几何保存在 `assets/geo/china-provinces.geojson`。地图保留来源中的省界、岛屿和南海附图，不声明它是经审核的测绘产品。

## 论文

编辑 **论文 / Publications** 添加标题、年份、DOI、期刊、作者名单；有 DOI 时自动构建链接。勾选 Feature on homepage 可进入首页精选。

- `_data/publications.json`：ORCID 导入，保留来源数据。
- `_data/publications_manual.json`：后台管理的全部论文，是前台列表的唯一数据源，已包含原先导入的 11 篇论文。
- 直接展开现有论文即可编辑；隐藏保留后台记录但不公开，删除则从列表移除。
- 未在 ORCID 中的论文也能添加；刷新 ORCID 仅追加新发现的论文，不覆盖已有编辑，不恢复之前删除或隐藏的记录。
- 页面和 BibTeX 下载在构建时统一生成，避免只更新页面而下载文件仍旧。

ORCID 更新仍可运行 `node scripts/import-orcid.mjs` 后检查差异、提交；没有后台定时自动抓取。

每篇论文的 **悬停配图 / Figure preview** 可上传、更换图片，填写图号、无障碍说明和来源。只有配置图片的论文才显示 Figure 入口；桌面悬停标题或键盘聚焦也可预览。点击标题仍打开原文，手机可点击 Figure。留空图片即关闭该论文预览。裁剪只限定可见 panel，原始文件不改动；更换图片时清空裁剪字段。不得删除科研图中的数据、比例尺、坐标和标注。

初次整理已配置 10 篇；PHF7（Development, 2019）缺少可取得的原图，等待作者提供。FXR1（Science, 2022）使用作者单位 CEMCS 的原文研究模式图，已注明来源，不冒充论文内的特定图号。来源链接与署名随预览显示。

后台每次 Save 会触发发布，页面不会瞬间改变。连续保存时，以最后一次发布成功的版本为准；毕业年份只在 Alumni 分类显示，简介在所有分类显示。

## 软件和联系方式

软件按组学与数据、成像与表型、研究效率与插件分类；最后一类统一显示为 **Research productivity**：Biomed Workbench 标为 Codex plugin，Paper Voice 标为 Zotero plugin。管理入口为 Admin → **Manage software visibility** 或后台 **软件 / Software**。展开工具，使用 **在网站显示 / Show on website** 开关并保存。关闭后前台不展示，但后台记录保留；某分类全部隐藏时，分类按钮也自动隐藏。新建工具需明确开启显示开关。显示开关不是保密功能，公共仓库仍可读取原始记录。保持原项目与 fork 的标注。Contact 中可以编辑邮箱和中英文地址；地图及导航按地址自动生成。

## 发布和恢复

保存会提交 GitHub 修改并触发 Actions。通过内容校验、图谱测试和构建后发布；通常需要几分钟。到仓库 Actions 查看结果，不要将“保存成功”直接等同于“线上部署成功”。构建失败时旧版继续服务。恢复旧内容可在 GitHub 撤销对应提交。

所有网站内容、已上传照片及表达数据目前公开。不要向公共仓库提交密码、私人联系方式、身份证件、未获准公开的研究数据。

## 仓库可以改为 private 吗？

GitHub Free 的 Pages 需要 public 仓库；GitHub Pro、Team 或 Enterprise 支持从 private 仓库发布。不要在未确认账号套餐时直接改为 private，可能导致站点停用。private 源码仓库不等于私有网站；公开网页及浏览器下载的图谱数据仍公开。

参考：[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[Pages CMS 首次登录](https://pagescms.org/docs/quick-start/)、[邮箱协作者权限](https://pagescms.org/docs/configuration/collaborators/)。
