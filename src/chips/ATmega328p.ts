import { clockConfig } from '../peripherals/clock';
import { eepromConfig } from '../peripherals/eeprom';
import { portBConfig, portCConfig, portDConfig } from '../peripherals/gpio';
import { spiConfig } from '../peripherals/spi';
import { timer0Config, timer1Config, timer2Config } from '../peripherals/timer';
import { twiConfig } from '../peripherals/twi';
import { usart0Config } from '../peripherals/usart';
import { Chip } from './chip';

export const ATmega328p: Chip = {
  flashSize: 0x8000,
  ramSize: 0x800,
  eepromSize: 0x400,
  registerSpace: 0x100,
  defaultFrequency: 16e6,
  clock: clockConfig,
  eeprom: eepromConfig,
  gpio: { B: portBConfig, C: portCConfig, D: portDConfig },
  timers: [timer0Config, timer1Config, timer2Config],
  spi: [spiConfig],
  usart: [usart0Config],
  twi: [twiConfig],
};
