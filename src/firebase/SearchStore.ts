import { liteClient } from 'algoliasearch/lite';
import {
  collection,
  DocumentData,
  getDocs,
  query,
  QuerySnapshot,
} from '@firebase/firestore';
import Firebase from './Firebase.ts';
import GearType from '../warehouse/type/GearType.ts';
import { SearchResponse } from 'algoliasearch';

class SearchStore {
  private readonly searchClient = liteClient(
    'RSDA6EDQZP',
    'e6231534c3832c1253d08ce1f2d3aaa7'
  );

  public constructor(private readonly firebase: Firebase) {}
}

export default SearchStore;
