export interface IPaginationParams {
  currentPage?: number;
  limit?: number;
}

export interface IPaginationMetaParams {
  current: number;
  pageSize: number;
  total: number;
}

export const getPaginationParams = ({ currentPage, limit }: IPaginationParams) => {
  const current = Number(currentPage) || 1;
  const pageSize = Number(limit) || 10;
  const skip = (current - 1) * pageSize;

  return {
    current,
    pageSize,
    skip,
  };
};

export const getPaginationMeta = ({ current, pageSize, total }: IPaginationMetaParams) => {
  return {
    current, //trang hiện tại
    pageSize, //số lượng bản ghi đã lấy
    pages: Math.ceil(total / pageSize), //tổng số trang với điều kiện query
    total, // tổng số phần tử (số bản ghi)
  };
};
