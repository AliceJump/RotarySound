import { execFile } from 'node:child_process';

export function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, numeric));
}

export function isWindowsPlatform(platform = process.platform) {
  return platform === 'win32';
}

export function buildSetMasterVolumeScript(percent) {
  const clamped = clampPercent(percent);
  const scalar = (clamped / 100).toFixed(4);

  return `$ErrorActionPreference = 'Stop'\n` +
    `Add-Type -Language CSharp -TypeDefinition @\"\n` +
    `using System;\n` +
    `using System.Runtime.InteropServices;\n` +
    `[Guid(\"A95664D2-9614-4F35-A746-DE8DB63617E6\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]\n` +
    `interface IMMDeviceEnumerator { int NotImpl1(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice); }\n` +
    `[Guid(\"D666063F-1587-4E43-81F1-B948E807363F\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]\n` +
    `interface IMMDevice { int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, out IAudioEndpointVolume ppInterface); }\n` +
    `[Guid(\"5CDF2C82-841E-4546-9722-0CF74078229A\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]\n` +
    `interface IAudioEndpointVolume {\n` +
    `  int RegisterControlChangeNotify(IntPtr pNotify);\n` +
    `  int UnregisterControlChangeNotify(IntPtr pNotify);\n` +
    `  int GetChannelCount(out uint pnChannelCount);\n` +
    `  int SetMasterVolumeLevel(float fLevelDB, Guid pguidEventContext);\n` +
    `  int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);\n` +
    `  int GetMasterVolumeLevel(out float pfLevelDB);\n` +
    `  int GetMasterVolumeLevelScalar(out float pfLevel);\n` +
    `}\n` +
    `[ComImport, Guid(\"BCDE0395-E52F-467C-8E3D-C4579291692E\")]\n` +
    `class MMDeviceEnumeratorComObject {}\n` +
    `public static class EndpointVolumeController {\n` +
    `  public static void SetMasterVolumeScalar(float scalar) {\n` +
    `    var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());\n` +
    `    IMMDevice device;\n` +
    `    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));\n` +
    `    var iid = typeof(IAudioEndpointVolume).GUID;\n` +
    `    IAudioEndpointVolume endpoint;\n` +
    `    Marshal.ThrowExceptionForHR(device.Activate(ref iid, 23, IntPtr.Zero, out endpoint));\n` +
    `    Marshal.ThrowExceptionForHR(endpoint.SetMasterVolumeLevelScalar(scalar, Guid.Empty));\n` +
    `  }\n` +
    `}\n` +
    `\"@\n` +
    `[EndpointVolumeController]::SetMasterVolumeScalar(${scalar})`;
}

export async function setMasterVolumePercent(percent, options = {}) {
  const { platform = process.platform, execFileFn = execFile } = options;

  if (!isWindowsPlatform(platform)) {
    throw new Error('Global audio output control is only supported on Windows.');
  }

  const script = buildSetMasterVolumeScript(percent);

  await new Promise((resolve, reject) => {
    execFileFn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      },
    );
  });
}
