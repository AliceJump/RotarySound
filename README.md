# RotarySound

用于 **Windows 全局音频输出** 的旋转音量控制工具（系统主音量，而非网页播放器内音量）。

## Windows 全局音量模式

通过 PowerShell + CoreAudio 接口，周期性调整系统主音量，实现“旋转”动态变化。

### 运行

```bash
npm run start:windows
```

可选参数：

```bash
node windows-global.js --min 20 --max 90 --interval 120 --phase-advance 0.15 --base-velocity 4.71238898
```

- `--min`: 最小音量百分比（0-100）
- `--max`: 最大音量百分比（0-100）
- `--interval`: 刷新间隔（毫秒，最小 16）
- `--phase-advance`: 曲线相位推进速度
- `--base-velocity`: 基础角速度

> 说明：当前实现控制的是 Windows 系统主音量；全局声像（左右声道平衡旋转）不在本实现范围。

## 旧版网页界面

仓库保留 `index.html` 与前端逻辑文件，仅用于本地网页音频演示，不具备系统级全局输出能力。

## 开发测试

```bash
npm test
```
