import { makeAutoObservable } from 'mobx';
import ManageStore from '../store/ManageStore';
import ManagerGear from './ManagerGear';
import { v4 as uuidv4 } from 'uuid';

class Manage {
  public static new() {
    return new Manage(ManageStore.new());
  }

  private items: ManagerGear[] = [];
  private loading = false;
  private lastDoc: any = null;
  private hasMore = true;
  private sortField: string = 'name';
  private sortOrder: 'asc' | 'desc' = 'asc';
  private searchText: string = '';
  public selectedIds: string[] = [];

  private constructor(private readonly manageStore: ManageStore) {
    makeAutoObservable(this);
  }

  public async resetList() {
    this.items = [];
    this.lastDoc = null;
    this.hasMore = true;
    await this.fetchNextPage();
  }

  public async fetchNextPage() {
    if (!this.hasMore || this.loading) return;
    this.setLoading(true);
    const { items, lastDoc } = await this.manageStore.getList({
      limit: 100,
      startAfterDoc: this.lastDoc,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
      searchText: this.searchText,
    });
    if (items.length < 100) this.hasMore = false;

    this.items = [...this.items, ...items];
    this.lastDoc = lastDoc;
    this.setLoading(false);
  }

  public getItems() {
    return this.items;
  }

  public canFetchMore() {
    return this.hasMore && !this.loading;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  public async updateName(id: string, newName: string) {
    await this.manageStore.updateName(id, newName);
    await this.resetList();
  }

  public async updateCompany(id: string, newCompany: string) {
    await this.manageStore.updateCompany(id, newCompany);
    await this.resetList();
  }

  public async updateWeight(id: string, newWeight: string) {
    await this.manageStore.updateWeight(id, newWeight);
    await this.resetList();
  }

  public async updateCategory(id: string, newCategory: string) {
    await this.manageStore.updateCategory(id, newCategory);
    await this.resetList();
  }

  public async updateNameKorean(id: string, newNameKorean: string) {
    await this.manageStore.updateNameKorean(id, newNameKorean);
    await this.resetList();
  }

  public async updateImageUrl(id: string, newImageUrl: string) {
    await this.manageStore.updateImageUrl(id, newImageUrl);
    await this.resetList();
  }

  public async updateGear(id: string, updateFields: Partial<ManagerGear>) {
    if (
      updateFields.imageUrl &&
      updateFields.name &&
      updateFields.imageUrl.length > 0 &&
      updateFields.imageUrl.includes('https://') &&
      !updateFields.imageUrl.includes('googleapis.com')
    ) {
      const imageUrl = await this.uploadAndUpdateImageUrl(id, updateFields.imageUrl, uuidv4());
      if (imageUrl) {
        updateFields.imageUrl = imageUrl;
      }
    }

    await this.manageStore.updateGear(id, updateFields);
    this.items = this.items.map((item) => (item.id === id ? { ...item, ...updateFields } : item));
  }

  public setSort(sortField: string, sortOrder: 'asc' | 'desc') {
    this.sortField = sortField;
    this.sortOrder = sortOrder;
    this.resetList();
  }

  public setSearch(searchText: string) {
    this.searchText = searchText;
    this.resetList();
  }

  public async addGearOnly(fields: Partial<ManagerGear>) {
    await this.manageStore.addGear(fields);
  }

  public async addGear(fields: Partial<ManagerGear>) {
    await this.manageStore.addGear(fields);
    await this.resetList();
  }

  public async deleteGear(id: string) {
    await this.manageStore.deleteGear(id);
    await this.resetList();
  }

  public async deleteGears(ids: string[]) {
    await this.manageStore.deleteGears(ids);
    await this.resetList();
  }

  public selectGear(id: string, checked: boolean) {
    if (checked) {
      if (!this.selectedIds.includes(id)) this.selectedIds.push(id);
    } else {
      this.selectedIds = this.selectedIds.filter((_id) => _id !== id);
    }
  }

  public clearSelected() {
    this.selectedIds = [];
  }

  public selectAll(ids: string[]) {
    this.selectedIds = [...ids];
  }

  public async uploadAndUpdateImageUrl(id: string, imageUrl: string, name: string) {
    const response = await fetch('https://uploadimage-434364025032.asia-northeast3.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, name }),
    });
    if (!response.ok) throw new Error('업로드 실패');
    const data = await response.json();
    if (data.downloadURL) {
      await this.updateImageUrl(id, data.downloadURL);
      await this.resetList();
      return data.downloadURL;
    }
    return null;
  }

  public async uploadImageUrl(imageUrl: string, name: string) {
    const response = await fetch('https://uploadimagefromurl-uaz7njqewq-du.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, name }),
    });
    if (!response.ok) {
      console.error(response);
      throw new Error('업로드 실패');
    }
    const data = await response.json();
    return data.downloadURL === 'true' ? null : data.downloadURL;
  }
}

export default Manage;
