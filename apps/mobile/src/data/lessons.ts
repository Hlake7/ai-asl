export type DynamicLetters = 'dynamic:user-name';

export interface LessonDefinition {
  id: string;
  title: string;
  order: number;
  letters: string[] | DynamicLetters;
}

export const UNIT_1: LessonDefinition[] = [
  { id: 'u1l1', order: 1, title: 'Sign Your Name',             letters: 'dynamic:user-name' },
  { id: 'u1l2', order: 2, title: 'A B C D E',                  letters: ['A','B','C','D','E'] },
  { id: 'u1l3', order: 3, title: 'F G H I J',                  letters: ['F','G','H','I','J'] },
  { id: 'u1l4', order: 4, title: 'K L M N O',                  letters: ['K','L','M','N','O'] },
  { id: 'u1l5', order: 5, title: 'P Q R S T',                  letters: ['P','Q','R','S','T'] },
  { id: 'u1l6', order: 6, title: 'U V W X Y Z',                letters: ['U','V','W','X','Y','Z'] },
  { id: 'u1l7', order: 7, title: 'Spell Short Words',           letters: ['C','A','T','D','O','G'] },
  { id: 'u1l8', order: 8, title: 'Sign Your Name — Full Review', letters: 'dynamic:user-name' },
];
