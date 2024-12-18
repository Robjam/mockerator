import { fakerEN as faker } from '@faker-js/faker';
import type { SimplePrimitive } from './SimplePrimitive.input';

export function createSimplePrimitive(overrides?: SimplePrimitive): SimplePrimitive {
  return {
    id: faker.number.int(),
    name: faker.lorem.word(),
    ...overrides,
  }
}
