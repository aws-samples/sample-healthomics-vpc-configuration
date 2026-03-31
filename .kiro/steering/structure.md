# Project Structure

```
bin/
  app.ts                        # CDK app entry point (example stack)

lib/
  index.ts                      # Barrel export (public API surface)
  healthomics-vpc.ts            # L3 construct — orchestrates all builders
  healthomics-vpc-props.ts      # Props interface for the construct
  constants.ts                  # Region/AZ map and default endpoint list
  region-validator.ts           # Region and AZ validation logic
  vpc-builder.ts                # VPC and subnet creation
  nat-gateway-builder.ts        # NAT gateway count logic by deployment mode
  security-group-builder.ts     # Security group with least-privilege rules
  endpoint-builder.ts           # VPC endpoint creation (gateway + interface)

test/
  *.test.ts                     # Unit tests (CloudFormation assertions)
  *.property.test.ts            # Property-based tests (fast-check)
```

## Architecture Pattern

The codebase follows a builder/orchestrator pattern:

- `HealthOmicsVpc` (in `healthomics-vpc.ts`) is the L3 construct that orchestrates everything
- Each concern is isolated into a dedicated builder module as a pure function:
  - `validateRegion()` — region/AZ validation
  - `createVpc()` — VPC and subnet creation
  - `getNatGatewayCount()` — NAT gateway count determination
  - `createSecurityGroup()` — security group creation
  - `createVpcEndpoints()` — VPC endpoint creation
- Builders accept a `Construct` scope and a typed props object, returning the created resources
- `constants.ts` holds all static configuration (region map, default endpoints)
- `index.ts` is the barrel export — only public types and the main construct are exported

## Conventions

- One builder function per file, exported as a named function
- Props interfaces use `readonly` fields with JSDoc comments
- Resource naming follows `{projectName}-{environment}-{resource}` pattern
- Test files mirror source files: `lib/foo.ts` → `test/foo.test.ts` and `test/foo.property.test.ts`
- Property tests reference requirement IDs in comments (e.g., `// Validates: Requirements 10.2`)
- Unit tests reference requirement IDs in describe/it blocks (e.g., `// Requirement 5.3`)
