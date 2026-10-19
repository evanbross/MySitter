/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { List, Datagrid, TextField, DateField } from "react-admin";

export const SubscriptionList = () => (
  <List>
    <Datagrid>
      <TextField source="id" />
      <TextField source="provider_id" />
      <TextField source="stripe_subscription_id" />
      <TextField source="tier" />
      <TextField source="status" />
      <DateField source="current_period_end" showTime />
    </Datagrid>
  </List>
);
