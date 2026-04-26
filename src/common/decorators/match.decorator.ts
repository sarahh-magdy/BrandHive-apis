import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function Match(property: string, options?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'Match',
      target: object.constructor,
      propertyName,
      options,
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedProperty] = args.constraints;
          return value === (args.object as any)[relatedProperty];
        },
      },
    });
  };
}