import * as React from 'react';
import { Panel, type PanelProps } from '@shared/ui/panel';

export function FormSection(props: PanelProps) {
  return (
    <Panel
      surface="transparent"
      borderTone="default"
      radius="xl"
      padding="md"
      elevation="none"
      {...props}
    />
  );
}

