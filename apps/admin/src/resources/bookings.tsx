/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { List, Datagrid, TextField, DateField, EditButton, Edit, SimpleForm, SelectInput } from "react-admin";

export const BookingList = () => (
  <List>
    <Datagrid>
      <TextField source="id" />
      <TextField source="customer_id" />
      <TextField source="provider_id" />
      <TextField source="status" />
      <TextField source="service_type" />
      <DateField source="start_at" showTime />
      <DateField source="end_at" showTime />
      <EditButton />
    </Datagrid>
  </List>
);

export const BookingEdit = () => (
  <Edit>
    <SimpleForm>
      <SelectInput source="status" choices={[
        { id: "PENDING", name: "Pending" },
        { id: "CONFIRMED", name: "Confirmed" },
        { id: "CANCELLED", name: "Cancelled" },
        { id: "COMPLETED", name: "Completed" },
      ]} />
    </SimpleForm>
  </Edit>
);
