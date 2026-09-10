import { ImageSourcePropType } from 'react-native';

const welcome1 = require('../../assets/images/welcome-1.jpg');
const welcome2 = require('../../assets/images/welcome-2.jpg');
const welcome3 = require('../../assets/images/welcome-3.jpg');
const welcome4 = require('../../assets/images/welcome-4.jpg');
const homeIdle = require('../../assets/images/home-idle.png');

export type WelcomeSlide = {
  id: string;
  title: string;
  body: string;
  image: ImageSourcePropType;
};

export const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    id: 'no-diet',
    title: 'Real Food, No Rules',
    body: 'No forbidden foods, no calorie counting. Fill your plate with real food and enjoy it inside your eating window.',
    image: welcome1,
  },
  {
    id: 'hydrate',
    title: 'Hydrate Through',
    body: 'Water is your best friend while fasting. It steadies energy, quiets hunger and keeps your head clear.',
    image: welcome2,
  },
  {
    id: 'when-not-what',
    title: 'When, Not What',
    body: 'Fasting is about timing, not tiny portions. Eat normally in your window — no punishment plates required.',
    image: welcome3,
  },
  {
    id: 'progress',
    title: 'Progress You Can See',
    body: 'Track your weight, hours and streak honestly. Small daily wins add up faster than you think.',
    image: welcome4,
  },
];

export const HOME_IDLE_IMAGE = homeIdle;
