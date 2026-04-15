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
