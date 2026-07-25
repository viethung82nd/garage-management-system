// Thin re-export of the resources API surface already defined on the shared
// workshop client — kept as its own module so this page follows the same
// file-splitting pattern as admin/parts (ui/api/index).
export {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  createResource,
  deleteResource,
  fetchResources,
  updateResource,
  type ApiResource,
  type ResourceType,
} from '../../../../shared/api/workshop'
