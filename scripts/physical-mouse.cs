using System;
using System.Threading;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;

public struct MousePoint { public int X,Y; public MousePoint(int x,int y){X=x;Y=y;} }
public struct MouseBounds { public int X,Y,Width,Height; public bool Contains(MousePoint p){return p.X>=X&&p.X<(long)X+Width&&p.Y>=Y&&p.Y<(long)Y+Height;} }
// The same motion engine is tested with managed boundaries; production delegates
// below only get/set physical cursor coordinates. It has no click/input API.
public sealed class MouseMotionEngine {
 readonly object gate=new object();long generation;
 readonly Func<MousePoint> read;readonly Action<MousePoint> write;readonly Func<MouseBounds,MousePoint,bool> valid;
 public event Action<long> Done;public event Action Failed;
 public MouseMotionEngine(Func<MousePoint> read,Action<MousePoint> write,Func<MouseBounds,MousePoint,bool> valid){this.read=read;this.write=write;this.valid=valid;}
 public static MousePoint Interpolate(MousePoint from,MousePoint to,double fraction){
  double t=Math.Max(0,Math.Min(1,fraction));double smooth=t*t*(3-2*t);
  return new MousePoint((int)Math.Round(from.X+(to.X-from.X)*smooth),(int)Math.Round(from.Y+(to.Y-from.Y)*smooth));
 }
 public void Stop(){lock(gate){generation++;}}
 public void Move(long id,MousePoint target,int speed,MouseBounds bounds){
  if(speed<200||speed>3000||!bounds.Contains(target))throw new ArgumentException();
  long token;MousePoint from;lock(gate){token=++generation;from=read();}
  double distance=Math.Sqrt(Math.Pow(target.X-from.X,2)+Math.Pow(target.Y-from.Y,2));
  double duration=Math.Max(80,Math.Min(60000,distance*1000/speed));
  ThreadPool.QueueUserWorkItem(delegate{
   try{
    Stopwatch clock=Stopwatch.StartNew();
    while(true){double elapsed=clock.Elapsed.TotalMilliseconds;
     lock(gate){if(token!=generation)return;if(!valid(bounds,target)){throw new InvalidOperationException();}write(Interpolate(from,target,elapsed/duration));}
     if(elapsed>=duration)break;Thread.Sleep(8);
    }
    lock(gate){if(token!=generation)return;MousePoint arrived=read();if(arrived.X!=target.X||arrived.Y!=target.Y)throw new InvalidOperationException();if(Done!=null)Done(id);}
   }catch{lock(gate){if(token==generation){generation++;if(Failed!=null)Failed();}}}
  });
 }
}
public static class PhysicalMouse {
 [StructLayout(LayoutKind.Sequential)]struct Rect {public int L,T,R,B;}
 [StructLayout(LayoutKind.Sequential)]struct MonitorInfo {public int Size;public Rect Monitor,Work;public uint Flags;}
 [DllImport("user32.dll")]static extern bool GetPhysicalCursorPos(out MousePoint point);
 [DllImport("user32.dll")]static extern bool SetPhysicalCursorPos(int x,int y);
 [DllImport("user32.dll")]static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
 [DllImport("user32.dll")]static extern IntPtr MonitorFromPoint(MousePoint point,uint flags);
 [DllImport("user32.dll")]static extern bool GetMonitorInfo(IntPtr monitor,ref MonitorInfo info);
 static readonly object output=new object();
 static void Emit(string line){lock(output){Console.WriteLine(line);Console.Out.Flush();}}
 static bool Valid(MouseBounds bounds,MousePoint target){
  SetThreadDpiAwarenessContext(new IntPtr(-4));
  MonitorInfo m=new MonitorInfo();m.Size=Marshal.SizeOf(typeof(MonitorInfo));IntPtr h=MonitorFromPoint(target,0);
  return h!=IntPtr.Zero&&GetMonitorInfo(h,ref m)&&m.Monitor.L==bounds.X&&m.Monitor.T==bounds.Y&&m.Monitor.R-bounds.X==bounds.Width&&m.Monitor.B-bounds.Y==bounds.Height;
 }
 public static void Run(){
  SetThreadDpiAwarenessContext(new IntPtr(-4));
  MouseMotionEngine engine=new MouseMotionEngine(
   delegate{MousePoint p;if(!GetPhysicalCursorPos(out p))throw new InvalidOperationException();return p;},
   delegate(MousePoint p){if(!SetPhysicalCursorPos(p.X,p.Y))throw new InvalidOperationException();},Valid);
  engine.Done+=delegate(long id){Emit("DONE|"+id.ToString(CultureInfo.InvariantCulture));};engine.Failed+=delegate{Emit("ERROR|movement");};
  Emit("READY");
  try{string line;while((line=Console.ReadLine())!=null){
   if(line=="STOP"){engine.Stop();continue;}
   string[] p=line.Split(' ');long id;int x,y,speed,bx,by,bw,bh;
   if(p.Length!=9||p[0]!="MOVE"||!Int64.TryParse(p[1],out id)||id<1||!Int32.TryParse(p[2],out x)||!Int32.TryParse(p[3],out y)||!Int32.TryParse(p[4],out speed)||!Int32.TryParse(p[5],out bx)||!Int32.TryParse(p[6],out by)||!Int32.TryParse(p[7],out bw)||!Int32.TryParse(p[8],out bh)||Math.Abs((long)x)>65536||Math.Abs((long)y)>65536||bw<1||bh<1||bw>65536||bh>65536||Math.Abs((long)bx)>65536||Math.Abs((long)by)>65536){engine.Stop();Emit("ERROR|command");continue;}
   try{engine.Move(id,new MousePoint(x,y),speed,new MouseBounds{X=bx,Y=by,Width=bw,Height=bh});}catch{engine.Stop();Emit("ERROR|movement");}
  }}finally{engine.Stop();}
 }
}
