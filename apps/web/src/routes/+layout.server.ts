export const load = ({ locals }) => ({
  session: locals.session ?? null,
  user: locals.user ?? null,
  activeOrganizationId: locals.activeOrganizationId ?? null
});
