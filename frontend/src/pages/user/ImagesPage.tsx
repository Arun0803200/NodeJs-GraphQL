import { useQuery } from "@apollo/client/react";
import { MY_IMAGES } from "../../api/queries";

export function ImagesPage() {
  const { data, loading } = useQuery(MY_IMAGES, { variables: { limit: 50 } });
  const images = data?.myImages?.data || [];

  return (
    <div className="page">
      <h1>My Images</h1>
      <p className="text-muted">Images are uploaded via the GraphQL upload API. This page shows your uploaded images.</p>
      {loading ? (
        <p>Loading...</p>
      ) : images.length === 0 ? (
        <p className="empty-state">No images uploaded yet.</p>
      ) : (
        <div className="image-grid">
          {images.map((img: any) => (
            <div key={img.id} className="image-card">
              <img src={img.imageUrl} alt={img.imageOriginalName} />
              <p>{img.imageOriginalName}</p>
              <small>{img.imageSize} KB &middot; {new Date(img.createdAt).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
