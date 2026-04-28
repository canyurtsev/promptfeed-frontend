import { serializeDecimals } from './src/utils/serialization.js';

const test = {
    id: '123',
    createdAt: new Date(),
    price: { constructor: { name: 'Decimal' }, toString: () => '99.99', toFixed: () => '99.99' }
};

const result = serializeDecimals(test);
console.log('Result:', result);
console.log('JSON:', JSON.stringify(result));
