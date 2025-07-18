// Static export compatibility
export async function generateStaticParams() {
  // For static export, we'll pre-generate a default editor route
  return [
    { project_id: 'new' }
  ];
}