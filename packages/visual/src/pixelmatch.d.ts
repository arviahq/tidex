declare module "pixelmatch" {
  function pixelmatch(
    img1: Uint8Array | Buffer,
    img2: Uint8Array | Buffer,
    output: Uint8Array | Buffer | null,
    width: number,
    height: number,
    options?: { threshold?: number },
  ): number;
  export default pixelmatch;
}
