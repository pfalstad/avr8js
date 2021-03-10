import {
  avrInstruction,
  AVRTimer,
  CPU,
  timer0Config,
  timer1Config,
  timer2Config,
  AVRIOPort,
  AVRUSART,
  portBConfig,
  portCConfig,
  portDConfig,
  usart0Config,
} from 'avr8js';
import { loadHex } from './intelhex';
import { MicroTaskScheduler } from './task-scheduler';

// ATmega328p params
const FLASH = 0x8000;

export class AVRRunner {
  readonly program = new Uint16Array(FLASH);
  readonly cpu: CPU;
  readonly timer0: AVRTimer;
  readonly timer1: AVRTimer;
  readonly timer2: AVRTimer;
  readonly portB: AVRIOPort;
  readonly portC: AVRIOPort;
  readonly portD: AVRIOPort;
  readonly usart: AVRUSART;
  readonly speed = 16e6; // 16 MHZ
  readonly workUnitCycles = 500000;
  readonly taskScheduler = new MicroTaskScheduler();

  constructor(hex: string, sim_) {
    loadHex(hex, new Uint8Array(this.program.buffer));
    this.cpu = new CPU(this.program);
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);
    this.usart = new AVRUSART(this.cpu, usart0Config, this.speed);

    this.taskScheduler.start();
    this.sim = sim_;
    this.prevTime = this.sim.getTime();
  }

  // CPU main loop
  execute(callback: (cpu: CPU) => void) {
    var timeDiff = this.sim.getTime() - this.prevTime;      //Added by Mark Megarry
    var cyclesToRun = this.cpu.cycles + timeDiff*this.speed; //Added by Mark Megarry
    this.getPinStates();
    while (this.cpu.cycles < cyclesToRun) {
      avrInstruction(this.cpu);
      this.cpu.tick();
    }
    this.prevTime = this.sim.getTime();

    callback(this.cpu);
    this.taskScheduler.postTask(() => this.execute(callback));
  }

  getPinStates() {
    var i;
    for (i = 0; i != 8; i++)
      this.sim.setExtVoltage("pin " + i, this.portD.pinState(i) ? 5 : 0);
    for (i = 0; i != 6; i++)
      this.sim.setExtVoltage("pin " + (i+8), this.portB.pinState(i) ? 5 : 0);
  }

  stop() {
    this.taskScheduler.stop();
  }
}
