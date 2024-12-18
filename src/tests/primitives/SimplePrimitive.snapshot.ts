import { fakerEN as faker } from '@faker-js/faker';

export function createSimplePrimitive(overrides?: SimplePrimitive): SimplePrimitive {
  return {
    id: faker.number.int(),
    name: faker.lorem.word(),
    ...overrides,
  }
}
