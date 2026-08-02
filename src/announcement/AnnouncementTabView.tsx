import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { Dayjs } from 'dayjs';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import app from '../App';
import { formatDateTime, formatPeriod, toDayjs, toIsoString } from './AdminDateUtil';
import AnnouncementPreview from './AnnouncementPreview';

// 작성/편집 폼 값 형태. 날짜는 antd DatePicker와 맞물리도록 Dayjs로 다룬다.
interface AnnouncementFormValues {
  id: string;
  message: string;
  link?: string;
  startAt?: Dayjs;
  endAt?: Dayjs;
}

// 보관함(announcements/{id}) 문서 형태. 선택 필드는 값이 있을 때만 포함한다.
interface AnnouncementArchiveDoc {
  id: string;
  message: string;
  link?: string;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 라이브(config/announcement) 문서 형태 — 앱이 실시간 구독하는 계약이므로 변경 금지.
interface AnnouncementLiveDoc {
  id: string;
  active: boolean;
  message: string;
  link?: string;
  startAt?: string;
  endAt?: string;
}

const LIVE_DOC_PATH = ['config', 'announcement'] as const;
const ARCHIVE_COLLECTION = 'announcements';

const AnnouncementTabView = () => {
  const [form] = Form.useForm<AnnouncementFormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liveDoc, setLiveDoc] = useState<AnnouncementLiveDoc | null>(null);
  const [archiveList, setArchiveList] = useState<AnnouncementArchiveDoc[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 미리보기 실시간 갱신용 폼 값 구독(Modal이 닫혀 있어도 안전).
  const watchedMessage = Form.useWatch('message', form);
  const watchedLink = Form.useWatch('link', form);

  const firebase = app.getFirebase();

  const getLiveDocRef = () => {
    return doc(firebase.getStore(), ...LIVE_DOC_PATH);
  };

  const getArchiveDocRef = (id: string) => {
    return doc(firebase.getStore(), ARCHIVE_COLLECTION, id);
  };

  const loadLive = async () => {
    const snapshot = await getDoc(getLiveDocRef());

    if (snapshot.exists()) {
      setLiveDoc(snapshot.data() as AnnouncementLiveDoc);
    } else {
      setLiveDoc(null);
    }
  };

  const loadArchive = async () => {
    const snapshot = await getDocs(
      query(collection(firebase.getStore(), ARCHIVE_COLLECTION), orderBy('updatedAt', 'desc'))
    );

    setArchiveList(snapshot.docs.map((item) => item.data() as AnnouncementArchiveDoc));
  };

  // 진입 시 라이브 문서와 보관함 목록을 1회 조회한다.
  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.all([loadLive(), loadArchive()]);
      } catch (error) {
        console.error('공지 데이터 로드 실패:', error);
        message.error('공지 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // 폼 값을 보관함 문서 형태로 변환. 선택 필드가 비면 키를 넣지 않는다(빈 문자열 저장 금지).
  const buildArchivePayload = (values: AnnouncementFormValues): AnnouncementArchiveDoc => {
    const id = values.id.trim();
    const existing = archiveList.find((item) => item.id === id);
    const now = new Date().toISOString();

    const payload: AnnouncementArchiveDoc = {
      id,
      message: values.message.trim(),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    const link = values.link?.trim();

    if (link) {
      payload.link = link;
    }

    const startAt = toIsoString(values.startAt);

    if (startAt) {
      payload.startAt = startAt;
    }

    const endAt = toIsoString(values.endAt);

    if (endAt) {
      payload.endAt = endAt;
    }

    return payload;
  };

  // 보관함 항목의 콘텐츠 필드만 라이브 문서 형태로 변환(createdAt/updatedAt 제외, active: true).
  const buildLivePayload = (item: AnnouncementArchiveDoc): AnnouncementLiveDoc => {
    const payload: AnnouncementLiveDoc = {
      id: item.id,
      active: true,
      message: item.message,
    };

    if (item.link) {
      payload.link = item.link;
    }

    if (item.startAt) {
      payload.startAt = item.startAt;
    }

    if (item.endAt) {
      payload.endAt = item.endAt;
    }

    return payload;
  };

  const handleClickCreate = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleClickEdit = (item: AnnouncementArchiveDoc) => {
    setEditingId(item.id);
    form.setFieldsValue({
      id: item.id,
      message: item.message,
      link: item.link ?? '',
      startAt: toDayjs(item.startAt),
      endAt: toDayjs(item.endAt),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // 보관함에 저장(문서 키 = id). 편집 중 id를 바꾸면 새 항목으로 저장되고 기존 항목은 남는다.
  const handleSubmitForm = async () => {
    let values: AnnouncementFormValues;

    try {
      values = await form.validateFields();
    } catch {
      // 필수값 누락 안내는 폼이 담당.
      return;
    }

    setSaving(true);

    try {
      const payload = buildArchivePayload(values);

      await setDoc(getArchiveDocRef(payload.id), payload);
      await loadArchive();
      setIsModalOpen(false);
      message.success('보관함에 저장되었습니다.');
    } catch (error) {
      console.error('공지 저장 실패:', error);
      message.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 발행: 보관함 항목을 active: true로 라이브 문서에 전체 덮어쓰기.
  const handleClickPublish = (item: AnnouncementArchiveDoc) => {
    const isNewId = !!liveDoc && liveDoc.id !== item.id;

    Modal.confirm({
      title: '이 항목을 라이브로 발행할까요?',
      content: isNewId
        ? `현재 라이브 공지(id: ${liveDoc?.id})와 id가 달라, 이전 공지를 닫았던 사용자에게도 새로 노출됩니다.`
        : `id "${item.id}" 항목이 앱에 즉시 노출됩니다.`,
      okText: '발행',
      cancelText: '취소',
      onOk: async () => {
        try {
          const payload = buildLivePayload(item);

          await setDoc(getLiveDocRef(), payload);
          setLiveDoc(payload);
          message.success('발행되었습니다.');
        } catch (error) {
          console.error('공지 발행 실패:', error);
          message.error('발행에 실패했습니다.');
        }
      },
    });
  };

  // 끄기: 라이브 문서는 두고 active만 false로 저장해 노출만 중단한다.
  const handleClickTurnOff = async () => {
    if (!liveDoc) {
      return;
    }

    try {
      const payload: AnnouncementLiveDoc = { ...liveDoc, active: false };

      await setDoc(getLiveDocRef(), payload);
      setLiveDoc(payload);
      message.success('노출을 껐습니다.');
    } catch (error) {
      console.error('공지 끄기 실패:', error);
      message.error('끄기에 실패했습니다.');
    }
  };

  // 내리기: 라이브 문서를 삭제해 공지를 완전히 제거한다(보관함은 유지).
  const handleClickTakeDown = () => {
    Modal.confirm({
      title: '라이브 공지를 내리시겠습니까?',
      content: '라이브 문서가 삭제되어 앱에서 공지가 완전히 사라집니다. 보관함 항목은 유지됩니다.',
      okText: '내리기',
      okButtonProps: { danger: true },
      cancelText: '취소',
      onOk: async () => {
        try {
          await deleteDoc(getLiveDocRef());
          setLiveDoc(null);
          message.success('라이브 공지를 내렸습니다.');
        } catch (error) {
          console.error('공지 내리기 실패:', error);
          message.error('내리기에 실패했습니다.');
        }
      },
    });
  };

  // 보관함 항목 삭제: 보관함에서만 지우며 라이브 노출에는 영향이 없다.
  const handleClickDelete = (item: AnnouncementArchiveDoc) => {
    Modal.confirm({
      title: '보관함에서 삭제하시겠습니까?',
      content: '보관함에서만 삭제되며, 라이브 노출에는 영향이 없습니다.',
      okText: '삭제',
      okButtonProps: { danger: true },
      cancelText: '취소',
      onOk: async () => {
        try {
          await deleteDoc(getArchiveDocRef(item.id));
          await loadArchive();
          message.success('삭제되었습니다.');
        } catch (error) {
          console.error('공지 보관함 삭제 실패:', error);
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
      title: 'id',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <Space>
          <span>{id}</span>
          {liveDoc?.id === id && <Tag color='green'>LIVE</Tag>}
        </Space>
      ),
    },
    {
      title: '요약',
      dataIndex: 'message',
      key: 'message',
      render: (value: string) => (
        <Typography.Text style={{ maxWidth: 240 }} ellipsis>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '기간',
      key: 'period',
      render: (_: unknown, item: AnnouncementArchiveDoc) => formatPeriod(item.startAt, item.endAt),
    },
    {
      title: '수정일',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '액션',
      key: 'actions',
      render: (_: unknown, item: AnnouncementArchiveDoc) => (
        <Space>
          <Button size='small' type='primary' onClick={() => handleClickPublish(item)}>
            발행
          </Button>
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
      <Card title='라이브 상태' style={{ marginBottom: 24 }}>
        {liveDoc ? (
          <>
            <Descriptions column={1} size='small' style={{ marginBottom: 16 }}>
              <Descriptions.Item label='id'>{liveDoc.id}</Descriptions.Item>
              <Descriptions.Item label='상태'>
                {liveDoc.active ? <Tag color='green'>ON</Tag> : <Tag>OFF</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label='본문'>
                <Typography.Text style={{ maxWidth: 400 }} ellipsis>
                  {liveDoc.message}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label='기간'>
                {formatPeriod(liveDoc.startAt, liveDoc.endAt)}
              </Descriptions.Item>
            </Descriptions>
            <Space>
              <Button onClick={handleClickTurnOff} disabled={!liveDoc.active}>
                끄기
              </Button>
              <Button danger onClick={handleClickTakeDown}>
                내리기
              </Button>
            </Space>
          </>
        ) : (
          <Typography.Text type='secondary'>발행된 항목 없음</Typography.Text>
        )}
      </Card>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          보관함
        </Typography.Title>
        <Button type='primary' onClick={handleClickCreate}>
          새로 만들기
        </Button>
      </div>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={archiveList}
        pagination={false}
        size='small'
        locale={{ emptyText: '보관함이 비어 있습니다.' }}
      />

      <Modal
        title={editingId ? '공지 편집' : '공지 작성'}
        open={isModalOpen}
        onOk={handleSubmitForm}
        onCancel={handleCloseModal}
        okText='보관함에 저장'
        cancelText='취소'
        confirmLoading={saving}
        width={840}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <Form form={form} layout='vertical' disabled={saving} requiredMark>
              <Form.Item
                label='공지 id'
                name='id'
                rules={[{ required: true, message: 'id를 입력해주세요.' }]}
                extra={
                  editingId
                    ? 'id를 바꾸면 새 항목으로 저장됩니다(기존 항목은 보관함에 남습니다).'
                    : '보관함 문서 키로 사용됩니다. 예: 2026-summer-notice'
                }
              >
                <Input placeholder='예: 2026-summer-notice' />
              </Form.Item>

              <Form.Item
                label='본문'
                name='message'
                rules={[{ required: true, message: '본문을 입력해주세요.' }]}
              >
                <Input.TextArea rows={4} placeholder='배너에 표시할 본문' />
              </Form.Item>

              <Form.Item
                label='링크 (선택)'
                name='link'
                extra='내부 경로는 /로 시작(예: /bag), 외부 링크는 http(s)://로 시작합니다.'
              >
                <Input placeholder='예: /bag 또는 https://example.com' />
              </Form.Item>

              <Form.Item label='노출 시작 (선택)' name='startAt'>
                <DatePicker showTime style={{ width: '100%' }} placeholder='노출 시작 일시' />
              </Form.Item>

              <Form.Item label='노출 종료 (선택)' name='endAt'>
                <DatePicker showTime style={{ width: '100%' }} placeholder='노출 종료 일시' />
              </Form.Item>
            </Form>
          </div>
          <div style={{ width: 340, flexShrink: 0 }}>
            <AnnouncementPreview
              message={watchedMessage ?? ''}
              link={watchedLink?.trim() ? watchedLink.trim() : undefined}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AnnouncementTabView;
