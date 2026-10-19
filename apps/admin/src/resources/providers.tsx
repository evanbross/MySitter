/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { List, Datagrid, TextField, BooleanField, NumberField, EditButton, Edit, SimpleForm, BooleanInput } from "react-admin";

export const ProviderList = () => (
  <List>
    <Datagrid>
      <TextField source="id" />
      <TextField source="user_id" />
      <BooleanField source="is_active" />
      <TextField source="subscription_tier" />
      <NumberField source="rating" />
      <NumberField source="review_count" />
      <EditButton />
    </Datagrid>
  </List>
);

export const ProviderEdit = () => (
  <Edit>
    <SimpleForm>
      <BooleanInput source="is_active" />
    </SimpleForm>
  </Edit>
);
