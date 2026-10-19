/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { Admin, Resource, CustomRoutes } from "react-admin";
import { Route } from "react-router-dom";
import { authProvider } from "./authProvider";
import { dataProvider } from "./dataProvider";
import { UserList, UserEdit } from "./resources/users";
import { ProviderList, ProviderEdit } from "./resources/providers";
import { BookingList, BookingEdit } from "./resources/bookings";
import { ConversationList, ConversationShow } from "./resources/conversations";
import { SubscriptionList } from "./resources/subscriptions";
import { ReviewList } from "./resources/reviews";
import { StatsDashboard } from "./resources/stats";
import { NotificationTrigger } from "./resources/notificationTrigger";

export default function App() {
  return (
    <Admin dataProvider={dataProvider} authProvider={authProvider} basename="/admin">
      <Resource name="users" list={UserList} edit={UserEdit} />
      <Resource name="providers" list={ProviderList} edit={ProviderEdit} />
      <Resource name="bookings" list={BookingList} edit={BookingEdit} />
      <Resource name="conversations" list={ConversationList} show={ConversationShow} />
      <Resource name="subscriptions" list={SubscriptionList} />
      <Resource name="reviews" list={ReviewList} />
      <CustomRoutes>
        <Route path="/stats" element={<StatsDashboard />} />
        <Route path="/notifications/send" element={<NotificationTrigger />} />
      </CustomRoutes>
    </Admin>
  );
}
