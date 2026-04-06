import {
  Admin,
  Resource,
  List,
  Datagrid,
  TextField,
  EmailField,
  BooleanField,
  DateField,
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
  Show,
  SimpleShowLayout,
} from "react-admin";
import simpleRestProvider from "ra-data-simple-rest";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const dataProvider = simpleRestProvider(`${BASE_URL}/admin`);

// ─── Users ────────────────────────────────────────────────────────────────────

function UserList() {
  return (
    <List>
      <Datagrid rowClick="edit">
        <TextField source="id" />
        <EmailField source="email" />
        <TextField source="display_name" label="Name" />
        <TextField source="role" />
        <BooleanField source="is_active" label="Active" />
        <DateField source="created_at" label="Joined" />
      </Datagrid>
    </List>
  );
}

function UserEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="display_name" label="Name" />
        <TextInput source="phone" />
        <BooleanInput source="is_active" label="Active" />
      </SimpleForm>
    </Edit>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Admin dataProvider={dataProvider} title="MyWatcher Admin">
      <Resource
        name="users"
        list={UserList}
        edit={UserEdit}
        recordRepresentation={(r) => r.email}
      />
      {/* More resources (bookings, providers, subscriptions) added in Phase 3 */}
    </Admin>
  );
}
