# Managed boundary tests. No user32 functions or real cursor movement are called.
$ErrorActionPreference='Stop'
$checks=@'
public static class MotionChecks {
 public static void Run(){
  MousePoint a=new MousePoint(-2000,-500),b=new MousePoint(-1,800),last=a;
  for(int i=0;i<=100;i++){MousePoint p=MouseMotionEngine.Interpolate(a,b,i/100.0);if(p.X<last.X||p.Y<last.Y||p.X>b.X||p.Y>b.Y)throw new Exception("Non-monotonic motion");last=p;}
  if(last.X!=b.X||last.Y!=b.Y)throw new Exception("Wrong endpoint");
  object gate=new object();MousePoint current=new MousePoint(-100,20);List<MousePoint> points=new List<MousePoint>();List<long> done=new List<long>();
  MouseMotionEngine engine=new MouseMotionEngine(delegate{lock(gate){return current;}},delegate(MousePoint p){lock(gate){current=p;points.Add(p);}},delegate(MouseBounds r,MousePoint p){return true;});
  engine.Done+=delegate(long id){lock(gate){done.Add(id);}};
  MouseBounds bounds=new MouseBounds{X=-200,Y=0,Width=1000,Height=800};
  engine.Move(1,new MousePoint(700,700),200,bounds);Thread.Sleep(50);engine.Stop();int stoppedCount;lock(gate){stoppedCount=points.Count;}Thread.Sleep(50);lock(gate){if(points.Count!=stoppedCount)throw new Exception("Moved after Stop");}
  engine.Move(2,new MousePoint(700,700),200,bounds);Thread.Sleep(30);engine.Move(3,new MousePoint(-5,20),3000,bounds);Thread.Sleep(350);engine.Stop();
  lock(gate){if(current.X!=-5||current.Y!=20||done.Contains(1)||done.Contains(2)||!done.Contains(3))throw new Exception("Replacement failed");}
  int invalidWrites=0;bool failed=false;
  MouseMotionEngine invalid=new MouseMotionEngine(delegate{return new MousePoint(0,0);},delegate(MousePoint p){invalidWrites++;},delegate(MouseBounds r,MousePoint p){return false;});
  invalid.Failed+=delegate{failed=true;};invalid.Move(4,new MousePoint(10,10),900,bounds);Thread.Sleep(150);invalid.Stop();if(invalidWrites!=0||!failed)throw new Exception("Invalid monitor moved cursor");
  failed=false;MouseMotionEngine clipped=new MouseMotionEngine(delegate{return new MousePoint(0,0);},delegate(MousePoint p){},delegate(MouseBounds r,MousePoint p){return true;});
  clipped.Failed+=delegate{failed=true;};clipped.Move(5,new MousePoint(10,10),900,bounds);Thread.Sleep(200);clipped.Stop();if(!failed)throw new Exception("Incorrectly reported clipped cursor as arrived");
 }
}
'@
$source=[IO.File]::ReadAllText((Join-Path (Split-Path $PSScriptRoot -Parent) 'scripts/physical-mouse.cs'))
Add-Type -CompilerOptions '/langversion:5' -TypeDefinition ("using System.Collections.Generic;`n"+$source+"`n"+$checks)
[MotionChecks]::Run()
'PASS: interpolation, negative physical coordinates, stop, replacement, invalid monitor and clipped cursor (managed OS boundaries; not Windows verification)'
