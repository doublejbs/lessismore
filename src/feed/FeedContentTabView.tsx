import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import app from '../App';

type FeedContentType = 'spot_intro' | 'gear_intro';

interface FeedContentDoc {
  id: string;
  type: FeedContentType;
  title: string;
  summary: string;
  relatedSpotId?: string;
  relatedGearId?: string;
  publishedAt?: string;
  published: boolean;
}

interface FeedContentFormValues {
  type: FeedContentType;
  title: string;
  summary: string;
  relatedSpotId?: string;
  relatedGearId?: string;
}

const COLLECTION = 'feed-content';

const TYPE_LABEL: Record<FeedContentType, string> = {
  spot_intro: '추천 박지',
  gear_intro: '추천 장비',
};

const formatPublishedAt = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const FeedContentTabView = () => {
  const [form] = Form.useForm<FeedContentFormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<FeedContentDoc[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const formType = Form.useWatch('type', form) ?? 'spot_intro';
  const firebase = app.getFirebase();

  const loadItems = async () => {
    const snapshot = await getDocs(collection(firebase.getStore(), COLLECTION));
    const nextItems = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<FeedContentDoc, 'id'>),
    }));

    nextItems.sort((left, right) => {
      const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : 0;
      const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : 0;

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return left.id.localeCompare(right.id);
    });
    setItems(nextItems);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadItems();
      } catch (error) {
        console.error('홈 추천 콘텐츠 로드 실패:', error);
        message.error('홈 추천 콘텐츠를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const getRelatedDocument = (type: FeedContentType, relatedId: string) => {
    const collectionName = type === 'spot_intro' ? 'camp-spot' : 'gear';
    return getDoc(doc(firebase.getStore(), collectionName, relatedId));
  };

  const validateRelatedDocument = async (type: FeedContentType, relatedId: string) => {
    const trimmedId = relatedId.trim();

    if (!trimmedId) {
      message.error(`${TYPE_LABEL[type]}의 관련 ID를 입력해주세요.`);
      return false;
    }

    try {
      const snapshot = await getRelatedDocument(type, trimmedId);

      if (!snapshot.exists()) {
        const target = type === 'spot_intro' ? '박지' : '장비';
        message.error(`관련 ${target} 문서를 찾을 수 없습니다. ID를 확인해주세요.`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('관련 문서 확인 실패:', error);
      message.error('관련 문서 확인에 실패했습니다. 잠시 후 다시 시도해주세요.');
      return false;
    }
  };

  const buildPayload = (
    values: FeedContentFormValues,
    published: boolean,
    publishedAt?: string
  ): Omit<FeedContentDoc, 'id'> => {
    const payload: Omit<FeedContentDoc, 'id'> = {
      type: values.type,
      title: values.title.trim(),
      summary: values.summary.trim(),
      published,
    };
    const relatedId =
      values.type === 'spot_intro' ? values.relatedSpotId?.trim() : values.relatedGearId?.trim();

    if (values.type === 'spot_intro') {
      payload.relatedSpotId = relatedId;
    } else {
      payload.relatedGearId = relatedId;
    }

    if (publishedAt) {
      payload.publishedAt = publishedAt;
    }

    return payload;
  };

  const handleClickCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ type: 'spot_intro' });
    setIsModalOpen(true);
  };

  const handleClickEdit = (item: FeedContentDoc) => {
    setEditingId(item.id);
    form.setFieldsValue({
      type: item.type,
      title: item.title,
      summary: item.summary,
      relatedSpotId: item.relatedSpotId ?? '',
      relatedGearId: item.relatedGearId ?? '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async () => {
    let values: FeedContentFormValues;

    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const relatedId =
      values.type === 'spot_intro' ? (values.relatedSpotId ?? '') : (values.relatedGearId ?? '');
    const isRelatedDocumentValid = await validateRelatedDocument(values.type, relatedId);

    if (!isRelatedDocumentValid) {
      return;
    }

    setSaving(true);

    try {
      const existing = editingId ? items.find((item) => item.id === editingId) : undefined;
      const published = existing?.published ?? false;
      const publishedAt = published
        ? (existing?.publishedAt ?? new Date().toISOString())
        : existing?.publishedAt;
      const payload = buildPayload(values, published, publishedAt);

      if (editingId) {
        await setDoc(doc(firebase.getStore(), COLLECTION, editingId), payload);
      } else {
        await addDoc(collection(firebase.getStore(), COLLECTION), payload);
      }

      await loadItems();
      setIsModalOpen(false);
      message.success('홈 추천 콘텐츠를 저장했습니다.');
    } catch (error) {
      console.error('홈 추천 콘텐츠 저장 실패:', error);
      message.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (item: FeedContentDoc, published: boolean) => {
    if (published) {
      const relatedId = item.type === 'spot_intro' ? item.relatedSpotId : item.relatedGearId;
      const isRelatedDocumentValid = await validateRelatedDocument(item.type, relatedId ?? '');

      if (!isRelatedDocumentValid) {
        return;
      }
    }

    setUpdatingId(item.id);

    try {
      const payload: Omit<FeedContentDoc, 'id'> = {
        type: item.type,
        title: item.title,
        summary: item.summary,
        published,
      };

      if (published || item.publishedAt) {
        payload.publishedAt = published ? new Date().toISOString() : item.publishedAt;
      }

      if (item.type === 'spot_intro') {
        payload.relatedSpotId = item.relatedSpotId;
      } else {
        payload.relatedGearId = item.relatedGearId;
      }

      await setDoc(doc(firebase.getStore(), COLLECTION, item.id), payload);
      await loadItems();
      message.success(published ? '발행되었습니다.' : '비발행으로 변경했습니다.');
    } catch (error) {
      console.error('홈 추천 콘텐츠 발행 상태 변경 실패:', error);
      message.error('발행 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClickDelete = (item: FeedContentDoc) => {
    Modal.confirm({
      title: '홈 추천 콘텐츠를 삭제하시겠습니까?',
      content: '삭제한 콘텐츠는 복구할 수 없습니다.',
      okText: '삭제',
      okButtonProps: { danger: true },
      cancelText: '취소',
      onOk: async () => {
        try {
          await deleteDoc(doc(firebase.getStore(), COLLECTION, item.id));
          await loadItems();
          message.success('삭제되었습니다.');
        } catch (error) {
          console.error('홈 추천 콘텐츠 삭제 실패:', error);
          message.error('삭제에 실패했습니다.');
        }
      },
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Spin />
      </div>
    );
  }

  const columns = [
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: (type: FeedContentType) => TYPE_LABEL[type] ?? type,
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <Typography.Text ellipsis>{title}</Typography.Text>,
    },
    {
      title: '발행 상태',
      dataIndex: 'published',
      key: 'published',
      render: (published: boolean, item: FeedContentDoc) => (
        <Space>
          <Switch
            checked={published}
            checkedChildren='발행'
            unCheckedChildren='초안'
            loading={updatingId === item.id}
            onChange={(value) => void handleTogglePublished(item, value)}
          />
          <Tag color={published ? 'green' : 'default'}>{published ? '발행' : '비발행'}</Tag>
        </Space>
      ),
    },
    {
      title: '발행일',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      render: (publishedAt?: string) => formatPublishedAt(publishedAt),
    },
    {
      title: '관련 ID',
      key: 'relatedId',
      render: (_: unknown, item: FeedContentDoc) =>
        item.type === 'spot_intro' ? item.relatedSpotId : item.relatedGearId,
    },
    {
      title: '액션',
      key: 'actions',
      render: (_: unknown, item: FeedContentDoc) => (
        <Space>
          <Button size='small' onClick={() => handleClickEdit(item)}>
            편집
          </Button>
          <Button size='small' danger onClick={() => handleClickDelete(item)}>
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          홈 추천 콘텐츠
        </Typography.Title>
        <Button type='primary' onClick={handleClickCreate}>
          새로 만들기
        </Button>
      </div>
      <Typography.Paragraph type='secondary'>
        발행된 콘텐츠는 앱 홈의 추천 박지·추천 장비 섹션에 노출됩니다.
      </Typography.Paragraph>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={items}
        pagination={false}
        size='small'
        locale={{ emptyText: '홈 추천 콘텐츠가 없습니다.' }}
      />

      <Modal
        title={editingId ? '홈 추천 콘텐츠 편집' : '홈 추천 콘텐츠 작성'}
        open={isModalOpen}
        onOk={handleSubmitForm}
        onCancel={() => setIsModalOpen(false)}
        okText='저장'
        cancelText='취소'
        confirmLoading={saving}
        width={640}
      >
        <Form form={form} layout='vertical' disabled={saving} requiredMark>
          <Form.Item
            label='유형'
            name='type'
            rules={[{ required: true, message: '유형을 선택해주세요.' }]}
          >
            <Select
              options={[
                { value: 'spot_intro', label: '추천 박지' },
                { value: 'gear_intro', label: '추천 장비' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label='제목'
            name='title'
            rules={[{ required: true, whitespace: true, message: '제목을 입력해주세요.' }]}
          >
            <Input placeholder='홈 카드에 표시할 제목' />
          </Form.Item>
          <Form.Item
            label='요약'
            name='summary'
            rules={[{ required: true, whitespace: true, message: '요약을 입력해주세요.' }]}
          >
            <Input.TextArea rows={4} placeholder='홈 카드에 표시할 요약' />
          </Form.Item>
          {formType === 'spot_intro' ? (
            <Form.Item
              label='관련 박지 ID'
              name='relatedSpotId'
              rules={[{ required: true, whitespace: true, message: '박지 ID를 입력해주세요.' }]}
              extra='camp-spot 문서의 ID를 입력해주세요.'
            >
              <Input placeholder='예: spot-id' />
            </Form.Item>
          ) : (
            <Form.Item
              label='관련 장비 ID'
              name='relatedGearId'
              rules={[{ required: true, whitespace: true, message: '장비 ID를 입력해주세요.' }]}
              extra='gear 문서의 ID를 입력해주세요.'
            >
              <Input placeholder='예: gear-id' />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default FeedContentTabView;
