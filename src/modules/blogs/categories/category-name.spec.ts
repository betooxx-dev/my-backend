import { categoryKey, categoryName } from './category-name';

describe('Category names', () => {
  it('normalizes spacing, Unicode, accents, case and punctuation', () => {
    expect(categoryName('  Tecnología   e IA  ')).toBe('Tecnología e IA');
    expect(categoryKey('  TECNOLOGÍA-e IA ')).toBe(
      categoryKey('tecnologia e ia'),
    );
    expect(categoryKey('Ｔｅｃｈ')).toBe(categoryKey('Tech'));
  });
  it('keeps unrelated names separate', () => {
    expect(categoryKey('Trabajo')).not.toBe(categoryKey('Tecnología'));
  });
});
