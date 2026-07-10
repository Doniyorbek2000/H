import { paginate } from './pagination.dto';

describe('paginate', () => {
  it('meta ni to‘g‘ri hisoblaydi', () => {
    const result = paginate([1, 2, 3], 45, 2, 20);
    expect(result.meta).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 });
    expect(result.data).toHaveLength(3);
  });

  it('bo‘sh natijada totalPages kamida 1 bo‘ladi', () => {
    const result = paginate([], 0, 1, 20);
    expect(result.meta.totalPages).toBe(1);
  });

  it('aniq bo‘linadigan holat', () => {
    expect(paginate([], 40, 1, 20).meta.totalPages).toBe(2);
  });
});
