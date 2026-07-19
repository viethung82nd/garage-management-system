/**
 * Generic Mongoose repository factory. Rather than hand-writing bespoke CRUD
 * wrappers per model (mostly boilerplate), this wraps the common operations
 * once and exposes `.model` as an escape hatch for the ad-hoc populate/
 * aggregate chains each domain already relies on — services use that instead
 * of importing models directly, so the model reference still only lives here.
 */
export function createRepository(Model) {
  return {
    model: Model,
    findById: (id, projection, options) => Model.findById(id, projection, options),
    findOne: (filter, projection, options) => Model.findOne(filter, projection, options),
    find: (filter = {}, projection, options) => Model.find(filter, projection, options),
    create: (data) => Model.create(data),
    updateById: (id, update, options = { new: true }) =>
      Model.findByIdAndUpdate(id, update, options),
    deleteById: (id) => Model.findByIdAndDelete(id),
    countDocuments: (filter = {}) => Model.countDocuments(filter),
    exists: (filter) => Model.exists(filter),
    aggregate: (pipeline) => Model.aggregate(pipeline),
  };
}
