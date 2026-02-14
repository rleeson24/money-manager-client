declare module "lodash/debounce" {
  function debounce<A extends unknown[], R>(
    func: (...args: A) => R,
    wait?: number
  ): ((...args: A) => R) & { cancel(): void };
  export default debounce;
}
