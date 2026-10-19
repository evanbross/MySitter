/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { List, Datagrid, TextField, DateField, NumberField, ShowButton, Show, SimpleShowLayout, ReferenceManyField } from "react-admin";

export const ConversationList = () => (
  <List>
    <Datagrid>
      <TextField source="id" />
      <TextField source="customer_id" />
      <TextField source="provider_id" />
      <NumberField source="unread_count" />
      <DateField source="created_at" showTime />
      <ShowButton />
    </Datagrid>
  </List>
);

export const ConversationShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="customer_id" />
      <TextField source="provider_id" />
      <ReferenceManyField reference="messages" target="conversation_id" label="Messages">
        <Datagrid bulkActionButtons={false}>
          <TextField source="sender_id" />
          <TextField source="body" />
          <DateField source="created_at" showTime />
        </Datagrid>
      </ReferenceManyField>
    </SimpleShowLayout>
  </Show>
);
