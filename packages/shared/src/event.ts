export interface DomainEvent<TType extends string, TPayload> {
  readonly type: TType;
  readonly version: 1;
  readonly streamId: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}

export const event = <TType extends string, TPayload>(
  type: TType,
  streamId: string,
  occurredAt: Date,
  payload: TPayload,
): DomainEvent<TType, TPayload> => ({
  type,
  version: 1,
  streamId,
  occurredAt,
  payload,
});
