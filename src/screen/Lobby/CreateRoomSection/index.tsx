import { Sparkles } from "lucide-react";
import Button from "@/component/Button";
import Card from "@/component/Card";

type CreateRoomSectionProps = {
  onCreateRoom: () => void;
};

// สร้างห้องใหม่: ไม่ต้องตั้งชื่อห้อง server จะสุ่มรหัส 4 ตัวให้
const CreateRoomSection = ({ onCreateRoom }: CreateRoomSectionProps) => {
  return (
    <Card
      title="สร้างห้องใหม่"
      description="ระบบจะสุ่มรหัสห้อง 4 ตัวให้ แล้วชวนเพื่อนเข้ามาด้วยรหัสหรือลิงก์ห้อง"
      icon={<Sparkles size={22} />}
    >
      <Button size="lg" fullWidth onClick={onCreateRoom}>
        สร้างห้อง
      </Button>
    </Card>
  );
};

export default CreateRoomSection;
