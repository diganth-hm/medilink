import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_URL } from "../../config";

export default function EmergencyPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/emergency/${token}`)
      .then(res => res.json())
      .then(setData);
  }, [token]);

  if (!data) return <div>Loading emergency info...</div>;

  return (
    <div>
      <h1>Emergency Medical Profile</h1>
      <p>Blood Group: {data.blood_group}</p>
      <p>Allergies: {data.allergies}</p>
      <p>Medications: {data.current_medications}</p>
      <p>Emergency Contact: {data.emergency_contact_name}</p>
    </div>
  );
}
