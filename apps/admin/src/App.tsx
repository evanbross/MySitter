import { Admin, Resource } from "react-admin";
import { dataProvider } from "./dataProvider";
import { UserList, UserEdit } from "./resources/users";
import { ProviderList, ProviderEdit } from "./resources/providers";
import { BookingList, BookingEdit } from "./resources/bookings";
import { ConversationList, ConversationShow } from "./resources/conversations";
import { SubscriptionList } from "./resources/subscriptions";
import { ReviewList } from "./resources/reviews";

export default function App() {
  return (
    <Admin dataProvider={dataProvider} basename="/admin">
      <Resource name="users" list={UserList} edit={UserEdit} />
      <Resource name="providers" list={ProviderList} edit={ProviderEdit} />
      <Resource name="bookings" list={BookingList} edit={BookingEdit} />
      <Resource name="conversations" list={ConversationList} show={ConversationShow} />
      <Resource name="subscriptions" list={SubscriptionList} />
      <Resource name="reviews" list={ReviewList} />
    </Admin>
  );
}
