# RotarySound

用于 **Windows 全局音频输出** 的旋转控制工具（系统主音量 + 左右声道平衡旋转，而非网页播放器内音量）。

## Windows 全局音量 + 声像模式

通过 PowerShell + CoreAudio 接口，周期性调整系统主音量与左右声道平衡，实现“旋转”动态变化。

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

> 说明：全局声像依赖设备支持多声道中的前两声道（典型立体声设备可用）。停止程序时会自动回正到中间平衡。

## 旧版网页界面

仓库保留 `index.html` 与前端逻辑文件，仅用于本地网页音频演示，不具备系统级全局输出能力。

## 开发测试

```bash
npm test
```
