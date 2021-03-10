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
  PinState
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

    // Simulate analog port (so that analogRead() eventually return)
    this.cpu.writeHooks[0x7a] = value => {
      if (value & (1 << 6)) {
        this.cpu.data[0x7a] = value & ~(1 << 6); // clear bit - conversion done
        const ADMUXval = this.cpu.data[0x7c];   //Value held in ADMUX selection register
        const analogPin = ADMUXval & 15;        //Apply mask to clear first 4 bits as only latter half is important for selection
        this.setAnalogValue(Math.floor(this.sim.getNodeVoltage("A" + analogPin) * 1023/5));
        return true; // don't update
      }
    };

    this.sim = sim_;
    this.prevTime = this.sim.getTime();
  }

  setAnalogValue(analogValue: number) {
    //Write analogValue to ADCH and ADCL
    this.cpu.data[0x78] = analogValue & 0xff;
    this.cpu.data[0x79] = (analogValue >> 8) & 0x3;
  }

  // set CPU main loop
  execute(callback: (cpu: CPU) => void) {
    var runner = this;
    this.sim.ontimestep = function () {
      var timeDiff = runner.sim.getTime() - runner.prevTime;      //Added by Mark Megarry
      var cyclesToRun = runner.cpu.cycles + timeDiff*runner.speed; //Added by Mark Megarry
      runner.getPinStates();
      while (runner.cpu.cycles < cyclesToRun) {
        avrInstruction(runner.cpu);
        runner.cpu.tick();
      }
      runner.prevTime = runner.sim.getTime();

      callback(runner.cpu);
    }
  }

  getPinStates() {
    var i;
    for (i = 0; i != 14; i++) {
      var port = this.portD;
      var pn = i;
      if (i >= 8) {
        port = this.portB;
        pn = i-8;
      }
      var ps = port.pinState(pn);
      if (ps == PinState.Input)
        port.setPin(pn, this.sim.getNodeVoltage("pin " + i) > 2.5);
      else
        this.sim.setExtVoltage("pin " + i, ps == PinState.High ? 5 : 0);
    }
  }

  stop() {
    this.sim.ontimestep = null;
  }
}
