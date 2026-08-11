import type { ActivityLevel, Sex } from '../types';

export interface ActivityLevelInfo {
  value: ActivityLevel;
  label: string;
  workoutsPerWeek: string;
  intensity: string;
  description: string;
}

export const ACTIVITY_LEVELS: ActivityLevelInfo[] = [
  {
    value: 'sedentary',
    label: 'לא פעיל',
    workoutsPerWeek: '0',
    intensity: '—',
    description: 'עבודה יושבנית ברוב היום, כמעט ואין פעילות גופנית מתוכננת.',
  },
  {
    value: 'light',
    label: 'קל',
    workoutsPerWeek: '1-3',
    intensity: 'קלה',
    description: 'הליכות, אימונים קלים או ספורט חובבני, 1-3 פעמים בשבוע.',
  },
  {
    value: 'moderate',
    label: 'בינוני',
    workoutsPerWeek: '3-5',
    intensity: 'בינונית',
    description: 'אימוני כוח או אירובי בעצימות בינונית, 3-5 פעמים בשבוע.',
  },
  {
    value: 'active',
    label: 'פעיל',
    workoutsPerWeek: '6-7',
    intensity: 'גבוהה',
    description: 'אימונים כמעט כל יום בעצימות גבוהה — ענף תחרותי או תוכנית אימונים מובנית.',
  },
  {
    value: 'very_active',
    label: 'פעיל מאוד',
    workoutsPerWeek: '6-7+',
    intensity: 'גבוהה מאוד',
    description: 'אימונים אינטנסיביים כל יום, לעיתים פעמיים ביום, או עבודה פיזית מאומצת בנוסף לאימונים.',
  },
];

export interface IntensityTier {
  label: string;
  rpe: string;
  talkTest: string;
  example: string;
}

/**
 * Reference legend for what "light/moderate/high/very high" intensity means in
 * practice, using the standard "talk test" (how easily you can speak while
 * exercising) plus a matching RPE (rate of perceived exertion, 1-10) range.
 */
export const INTENSITY_LEVELS: IntensityTier[] = [
  {
    label: 'קלה',
    rpe: '1-3',
    talkTest: 'אפשר לדבר בקלות ואפילו לשיר',
    example: 'הליכה, מתיחות, יוגה קלה',
  },
  {
    label: 'בינונית',
    rpe: '4-6',
    talkTest: 'אפשר לדבר במשפטים מלאים, לא לשיר',
    example: 'ריצה קלה, אימון כוח בקצב סדיר, רכיבה',
  },
  {
    label: 'גבוהה',
    rpe: '7-8',
    talkTest: 'אפשר להגיד רק כמה מילים ברצף',
    example: 'אינטרוולים, סטים כבדים קרוב לכשל, HIIT',
  },
  {
    label: 'גבוהה מאוד',
    rpe: '9-10',
    talkTest: 'אי אפשר לדבר כלל, מאמץ מקסימלי',
    example: 'ספרינטים, תחרות, אימון כפול ביום',
  },
];

export const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: 'זכר', value: 'male' },
  { label: 'נקבה', value: 'female' },
];
