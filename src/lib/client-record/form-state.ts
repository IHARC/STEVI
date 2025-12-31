export type ClientRecordFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export const clientRecordInitialState: ClientRecordFormState = { status: 'idle' };
