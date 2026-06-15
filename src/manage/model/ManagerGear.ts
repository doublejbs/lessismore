class ManagerGear {
  id: string;
  name: string;
  company: string;
  companyKorean: string;
  weight: string;
  category: string;
  secondaryCategory?: string;
  tertiaryCategory?: string;
  createDate: number;
  imageUrl: string;
  color?: string;
  colorKorean?: string;
  size?: string;
  sizeKorean?: string;
  nameKorean: string;

  constructor({
    id,
    name,
    company,
    companyKorean,
    weight,
    category,
    secondaryCategory = '',
    tertiaryCategory = '',
    createDate,
    imageUrl = '',
    color = '',
    colorKorean = '',
    size = '',
    sizeKorean = '',
    nameKorean = '',
  }: {
    id: string;
    name: string;
    company: string;
    companyKorean: string;
    weight: string;
    category: string;
    secondaryCategory?: string;
    tertiaryCategory?: string;
    createDate: number;
    imageUrl?: string;
    color?: string;
    colorKorean?: string;
    size?: string;
    sizeKorean?: string;
    nameKorean?: string;
  }) {
    this.id = id;
    this.name = name;
    this.company = company;
    this.companyKorean = companyKorean;
    this.weight = weight;
    this.category = category;
    this.secondaryCategory = secondaryCategory;
    this.tertiaryCategory = tertiaryCategory;
    this.createDate = createDate;
    this.imageUrl = imageUrl;
    this.color = color;
    this.colorKorean = colorKorean;
    this.size = size;
    this.sizeKorean = sizeKorean;
    this.nameKorean = nameKorean;
  }
}

export default ManagerGear;
