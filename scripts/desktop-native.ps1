# Shared native metadata only; no pixel or text access here.
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class DesktopNative {
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    public static void EnableDpi() { try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { SetProcessDPIAware(); } }
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder name, int length);
    public static bool Suitable(IntPtr h, uint owner) {
        uint pid; GetWindowThreadProcessId(h, out pid);
        var name=new StringBuilder(256); GetClassName(h,name,256);
        return h!=IntPtr.Zero && IsWindow(h) && IsWindowVisible(h) && !IsIconic(h) && pid!=owner && pid!=0
            && name.ToString()!="Progman" && name.ToString()!="WorkerW" && name.ToString()!="Shell_TrayWnd" && name.ToString()!="Shell_SecondaryTrayWnd";
    }
    public static IntPtr Target(uint owner, long previous) {
        var active=GetForegroundWindow();
        if(Suitable(active,owner))return active;
        var cached=new IntPtr(previous);
        return Suitable(cached,owner)?cached:IntPtr.Zero;
    }
    public delegate void WinEventDelegate(IntPtr hook,uint ev,IntPtr h,int obj,int child,uint thread,uint time);
    [DllImport("user32.dll")] public static extern IntPtr SetWinEventHook(uint min,uint max,IntPtr module,WinEventDelegate callback,uint process,uint thread,uint flags);
    [DllImport("user32.dll")] public static extern bool UnhookWinEvent(IntPtr hook);
    public static WinEventDelegate Callback;
    public static IntPtr Observe(uint owner) {
        Callback=(hook,ev,h,obj,child,thread,time)=>{if(Suitable(h,owner)){Console.WriteLine(h.ToInt64());Console.Out.Flush();}};
        var current=GetForegroundWindow();if(Suitable(current,owner)){Console.WriteLine(current.ToInt64());Console.Out.Flush();}
        return SetWinEventHook(3,3,IntPtr.Zero,Callback,0,0,0);
    }
}
'@
