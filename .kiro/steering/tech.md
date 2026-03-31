# Tech Stack

## Core

- Language: TypeScript (ES2020 target, strict mode)
- Framework: AWS CDK v2 (`aws-cdk-lib ^2.175.1`, `constructs ^10.4.2`)
- Module system: CommonJS
- Runtime: Node.js

## Dev Dependencies

- TypeScript `^5.7.3`
- Jest `^29.7.0` with `ts-jest ^29.2.5` (test runner)
- `fast-check ^3.23.2` (property-based testing)
- `@types/jest ^29.5.14`

## Common Commands

```bash
# Compile TypeScript
npm run build

# Run all tests (unit + property-based)
npm test

# Run a specific test file
npx jest test/<filename>.test.ts

# Run tests with verbose output
npx jest --verbose

# Synthesize CloudFormation template
npx cdk synth
```

## TypeScript Configuration

- Strict mode enabled (strictNullChecks, noImplicitAny, noImplicitReturns, noFallthroughCasesInSwitch)
- Output directory: `./dist`
- Source maps: inline
- Includes: `lib/**/*.ts`, `test/**/*.ts`, `bin/**/*.ts`

## Testing Approach

- Unit tests use `aws-cdk-lib/assertions` (`Template.fromStack`) to verify synthesized CloudFormation templates
- Property-based tests use `fast-check` with 100 iterations per property (`{ numRuns: 100 }`)
- Test files live in `test/` with naming conventions:
  - `*.test.ts` for unit tests
  - `*.property.test.ts` for property-based tests
- Jest config: `ts-jest` preset, `node` test environment, roots in `<rootDir>/test`
