/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { List, Datagrid, TextField, NumberField, DateField, DeleteButton } from "react-admin";

export const ReviewList = () => (
  <List>
    <Datagrid>
      <TextField source="id" />
      <TextField source="booking_id" />
      <TextField source="reviewer_id" />
      <TextField source="reviewee_id" />
      <NumberField source="rating" />
      <TextField source="body" />
      <DateField source="created_at" showTime />
      <DeleteButton />
    </Datagrid>
  </List>
);
