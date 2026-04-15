import { List, Datagrid, TextField, EmailField, BooleanField, EditButton, Edit, SimpleForm, TextInput, BooleanInput, SelectInput } from "react-admin";

export const UserList = () => (
  <List>
    <Datagrid>
      <TextField source="id" />
      <EmailField source="email" />
      <TextField source="display_name" />
      <TextField source="role" />
      <BooleanField source="is_active" />
      <EditButton />
    </Datagrid>
  </List>
);

export const UserEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="display_name" />
      <BooleanInput source="is_active" />
      <SelectInput source="role" choices={[
        { id: "CUSTOMER", name: "Customer" },
        { id: "PROVIDER", name: "Provider" },
        { id: "ADMIN", name: "Admin" },
      ]} />
    </SimpleForm>
  </Edit>
);
