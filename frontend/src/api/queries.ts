import { gql } from "@apollo/client/core";

// ─── Auth ────────────────────────────────────────────
export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      status message token
      data { id userUuid userName fullName designation email mobileNo address }
    }
  }
`;

export const REGISTER = gql`
  mutation Register($email: String!, $userName: String!, $password: String!, $confirmPassword: String) {
    register(email: $email, userName: $userName, password: $password, confirmPassword: $confirmPassword) {
      status message token
      data { id userUuid userName fullName designation email }
    }
  }
`;

export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email) { status message }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $password: String!, $confirmPassword: String!) {
    resetPassword(token: $token, password: $password, confirmPassword: $confirmPassword) { status message }
  }
`;

export const ME = gql`
  query Me { me { status message data { id userUuid userName fullName designation email mobileNo address } } }
`;

// ─── Admin: Users ────────────────────────────────────
export const ADMIN_GET_ALL_USERS = gql`
  query AdminGetAllUsers($limit: Float, $offset: Float) {
    adminGetAllUsers(limit: $limit, offset: $offset) {
      status message total
      data { id userUuid userName fullName designation email mobileNo createdAt }
    }
  }
`;

export const ADMIN_GET_USER = gql`
  query AdminGetUser($uuid: String!) {
    adminGetUser(uuid: $uuid) {
      status message
      data { id userUuid userName fullName designation contactUsDescription email mobileNo address socialMedia { name url } createdAt updatedAt }
    }
  }
`;

export const ADMIN_CREATE_USER = gql`
  mutation AdminCreateUser(
    $fullName: String!, $designation: String!, $email: String!, $password: String!,
    $role: String, $contactUsDescription: String, $mobileNo: String, $address: String,
    $socialMedia: [SocialMediaInput!], $userName: String
  ) {
    adminCreateUser(
      fullName: $fullName, designation: $designation, email: $email, password: $password,
      role: $role, contactUsDescription: $contactUsDescription, mobileNo: $mobileNo,
      address: $address, socialMedia: $socialMedia, userName: $userName
    ) { status message data { userUuid fullName email } }
  }
`;

export const ADMIN_UPDATE_USER = gql`
  mutation AdminUpdateUser(
    $uuid: String!, $fullName: String, $designation: String, $contactUsDescription: String,
    $email: String, $mobileNo: String, $address: String, $socialMedia: [SocialMediaInput!]
  ) {
    adminUpdateUser(
      uuid: $uuid, fullName: $fullName, designation: $designation,
      contactUsDescription: $contactUsDescription, email: $email, mobileNo: $mobileNo,
      address: $address, socialMedia: $socialMedia
    ) { status message data { id userUuid fullName email } }
  }
`;

export const ADMIN_DEACTIVATE_USER = gql`
  mutation AdminDeactivateUser($uuid: String!) {
    adminDeactivateUser(uuid: $uuid) { status message }
  }
`;

export const ADMIN_ACTIVATE_USER = gql`
  mutation AdminActivateUser($uuid: String!) {
    adminActivateUser(uuid: $uuid) { status message }
  }
`;

export const ADMIN_GET_STATS = gql`
  query AdminGetStats {
    adminGetStats { status message totalUsers totalActiveUsers totalImages }
  }
`;

// ─── Admin: Portfolio sections ───────────────────────
export const ADMIN_GET_ABOUT = gql`
  query AdminGetAbout($userUuid: String!) {
    adminGetAbout(userUuid: $userUuid) { status message data { id title description longDescription totalExperience totalProjects totalAwards } }
  }
`;

export const ADMIN_GET_EXPERIENCES = gql`
  query AdminGetExperiences($userUuid: String!, $limit: Float, $offset: Float) {
    adminGetExperiences(userUuid: $userUuid, limit: $limit, offset: $offset) {
      status message data { id companyName companyUrl companyLocation designation startDate endDate isCurrentlyWorking jobDescription skills }
    }
  }
`;

export const ADMIN_GET_PROJECTS = gql`
  query AdminGetProjects($userUuid: String!, $limit: Float, $offset: Float) {
    adminGetProjects(userUuid: $userUuid, limit: $limit, offset: $offset) {
      status message data { id projectName projectDescription projectUrl projectStartDate projectEndDate isCurrentProject projectLongDescription keyFeatures technologiesSkills }
    }
  }
`;

export const ADMIN_GET_SKILLS = gql`
  query AdminGetSkills($userUuid: String!) {
    adminGetSkills(userUuid: $userUuid) { status message data { id tittle skills } }
  }
`;

export const ADMIN_GET_AWARDS = gql`
  query AdminGetAwards($userUuid: String!) {
    adminGetAwards(userUuid: $userUuid) { status message data { id title description companyId eventDate } }
  }
`;

export const ADMIN_GET_EDUCATION = gql`
  query AdminGetEducation($userUuid: String!) {
    adminGetEducation(userUuid: $userUuid) { status message data { id degree fieldOfStudy institution institutionLocation startYear endYear } }
  }
`;

export const ADMIN_GET_CONTACT_MESSAGES = gql`
  query AdminGetContactMessages($userUuid: String, $limit: Float, $offset: Float) {
    adminGetContactMessages(userUuid: $userUuid, limit: $limit, offset: $offset) {
      status message data { id userUuid senderName senderEmail message createdAt }
    }
  }
`;

export const ADMIN_GET_USER_IMAGES = gql`
  query AdminGetUserImages($userUuid: String!, $limit: Float, $offset: Float) {
    adminGetUserImages(userUuid: $userUuid, limit: $limit, offset: $offset) {
      status message data { id imageOriginalName imageMimeType imageSize imageUrl createdAt }
    }
  }
`;

export const ADMIN_DELETE_EXPERIENCE = gql`mutation AdminDeleteExperience($id: Float!) { adminDeleteExperience(id: $id) { status message } }`;
export const ADMIN_DELETE_PROJECT = gql`mutation AdminDeleteProject($id: Float!) { adminDeleteProject(id: $id) { status message } }`;
export const ADMIN_DELETE_SKILLS = gql`mutation AdminDeleteSkills($id: Float!) { adminDeleteSkills(id: $id) { status message } }`;
export const ADMIN_DELETE_AWARD = gql`mutation AdminDeleteAward($id: Float!) { adminDeleteAward(id: $id) { status message } }`;
export const ADMIN_DELETE_EDUCATION = gql`mutation AdminDeleteEducation($id: Float!) { adminDeleteEducation(id: $id) { status message } }`;
export const ADMIN_DELETE_CONTACT = gql`mutation AdminDeleteContact($id: Float!) { adminDeleteContactMessage(id: $id) { status message } }`;

// ─── User Panel ──────────────────────────────────────
export const MY_PROFILE = gql`
  query MyProfile {
    myProfile { status message data { id userUuid userName fullName designation contactUsDescription email mobileNo address socialMedia { name url } } }
  }
`;

export const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($userName: String, $fullName: String, $designation: String, $contactUsDescription: String, $mobileNo: String, $address: String, $socialMedia: [SocialMediaInput!]) {
    updateMyProfile(userName: $userName, fullName: $fullName, designation: $designation, contactUsDescription: $contactUsDescription, mobileNo: $mobileNo, address: $address, socialMedia: $socialMedia) {
      status message data { id userName fullName designation email }
    }
  }
`;

export const MY_ABOUT = gql`
  query MyAbout { myAbout { status message data { id title description longDescription totalExperience totalProjects totalAwards } } }
`;

export const UPSERT_MY_ABOUT = gql`
  mutation UpsertMyAbout($title: String!, $description: String!, $longDescription: String!, $totalExperience: Int!, $totalProjects: Int!, $totalAwards: Int!) {
    upsertMyAbout(title: $title, description: $description, longDescription: $longDescription, totalExperience: $totalExperience, totalProjects: $totalProjects, totalAwards: $totalAwards) {
      status message
    }
  }
`;

export const MY_EXPERIENCES = gql`
  query MyExperiences($limit: Float, $offset: Float) {
    myExperiences(limit: $limit, offset: $offset) {
      status message data { id companyName companyUrl companyLocation designation startDate endDate isCurrentlyWorking jobDescription skills }
    }
  }
`;

export const ADD_MY_EXPERIENCE = gql`
  mutation AddMyExperience($companyName: String!, $companyUrl: String!, $companyLocation: String!, $designation: String!, $startDate: DateTime!, $isCurrentlyWorking: Boolean!, $jobDescription: String!, $skills: [String!]!, $endDate: DateTime) {
    addMyExperience(companyName: $companyName, companyUrl: $companyUrl, companyLocation: $companyLocation, designation: $designation, startDate: $startDate, isCurrentlyWorking: $isCurrentlyWorking, jobDescription: $jobDescription, skills: $skills, endDate: $endDate) {
      status message
    }
  }
`;

export const UPDATE_MY_EXPERIENCE = gql`
  mutation UpdateMyExperience($id: Float!, $companyName: String, $companyUrl: String, $companyLocation: String, $designation: String, $startDate: DateTime, $endDate: DateTime, $isCurrentlyWorking: Boolean, $jobDescription: String, $skills: [String!]) {
    updateMyExperience(id: $id, companyName: $companyName, companyUrl: $companyUrl, companyLocation: $companyLocation, designation: $designation, startDate: $startDate, endDate: $endDate, isCurrentlyWorking: $isCurrentlyWorking, jobDescription: $jobDescription, skills: $skills) {
      status message
    }
  }
`;

export const DELETE_MY_EXPERIENCE = gql`mutation DeleteMyExperience($id: Float!) { deleteMyExperience(id: $id) { status message } }`;

export const MY_PROJECTS = gql`
  query MyProjects($limit: Float, $offset: Float) {
    myProjects(limit: $limit, offset: $offset) {
      status message data { id projectName projectDescription projectUrl projectStartDate projectEndDate isCurrentProject projectLongDescription keyFeatures technologiesSkills }
    }
  }
`;

export const ADD_MY_PROJECT = gql`
  mutation AddMyProject($projectName: String!, $projectDescription: String!, $projectUrl: String!, $projectStartDate: DateTime!, $projectLongDescription: String!, $keyFeatures: [String!]!, $technologiesSkills: [String!]!, $projectEndDate: DateTime, $isCurrentProject: Boolean) {
    addMyProject(projectName: $projectName, projectDescription: $projectDescription, projectUrl: $projectUrl, projectStartDate: $projectStartDate, projectLongDescription: $projectLongDescription, keyFeatures: $keyFeatures, technologiesSkills: $technologiesSkills, projectEndDate: $projectEndDate, isCurrentProject: $isCurrentProject) {
      status message
    }
  }
`;

export const UPDATE_MY_PROJECT = gql`
  mutation UpdateMyProject($id: Float!, $projectName: String, $projectDescription: String, $projectUrl: String, $projectStartDate: DateTime, $projectEndDate: DateTime, $isCurrentProject: Boolean, $projectLongDescription: String, $keyFeatures: [String!], $technologiesSkills: [String!]) {
    updateMyProject(id: $id, projectName: $projectName, projectDescription: $projectDescription, projectUrl: $projectUrl, projectStartDate: $projectStartDate, projectEndDate: $projectEndDate, isCurrentProject: $isCurrentProject, projectLongDescription: $projectLongDescription, keyFeatures: $keyFeatures, technologiesSkills: $technologiesSkills) {
      status message
    }
  }
`;

export const DELETE_MY_PROJECT = gql`mutation DeleteMyProject($id: Float!) { deleteMyProject(id: $id) { status message } }`;

export const MY_SKILLS = gql`query MySkills { mySkills { status message data { id tittle skills } } }`;

export const ADD_MY_SKILLS = gql`
  mutation AddMySkills($tittle: String!, $skills: [String!]!) {
    addMySkills(tittle: $tittle, skills: $skills) { status message }
  }
`;

export const UPDATE_MY_SKILLS = gql`
  mutation UpdateMySkills($id: Float!, $tittle: String, $skills: [String!]) {
    updateMySkills(id: $id, tittle: $tittle, skills: $skills) { status message }
  }
`;

export const DELETE_MY_SKILLS = gql`mutation DeleteMySkills($id: Float!) { deleteMySkills(id: $id) { status message } }`;

export const MY_AWARDS = gql`query MyAwards { myAwards { status message data { id title description companyId eventDate } } }`;

export const ADD_MY_AWARD = gql`
  mutation AddMyAward($title: String!, $description: String!, $companyId: Float!, $eventDate: String!) {
    addMyAward(title: $title, description: $description, companyId: $companyId, eventDate: $eventDate) { status message }
  }
`;

export const UPDATE_MY_AWARD = gql`
  mutation UpdateMyAward($id: Float!, $title: String, $description: String, $companyId: Float, $eventDate: String) {
    updateMyAward(id: $id, title: $title, description: $description, companyId: $companyId, eventDate: $eventDate) { status message }
  }
`;

export const DELETE_MY_AWARD = gql`mutation DeleteMyAward($id: Float!) { deleteMyAward(id: $id) { status message } }`;

export const MY_EDUCATION = gql`query MyEducation { myEducation { status message data { id degree fieldOfStudy institution institutionLocation startYear endYear } } }`;

export const ADD_MY_EDUCATION = gql`
  mutation AddMyEducation($degree: String!, $fieldOfStudy: String!, $institution: String!, $institutionLocation: String!, $startYear: String!, $endYear: String) {
    addMyEducation(degree: $degree, fieldOfStudy: $fieldOfStudy, institution: $institution, institutionLocation: $institutionLocation, startYear: $startYear, endYear: $endYear) { status message }
  }
`;

export const UPDATE_MY_EDUCATION = gql`
  mutation UpdateMyEducation($id: Float!, $degree: String, $fieldOfStudy: String, $institution: String, $institutionLocation: String, $startYear: String, $endYear: String) {
    updateMyEducation(id: $id, degree: $degree, fieldOfStudy: $fieldOfStudy, institution: $institution, institutionLocation: $institutionLocation, startYear: $startYear, endYear: $endYear) { status message }
  }
`;

export const DELETE_MY_EDUCATION = gql`mutation DeleteMyEducation($id: Float!) { deleteMyEducation(id: $id) { status message } }`;

export const MY_IMAGES = gql`
  query MyImages($limit: Float, $offset: Float) {
    myImages(limit: $limit, offset: $offset) { status message data { id imageOriginalName imageUrl imageSize createdAt } }
  }
`;

// ─── Guest (public portfolio) ────────────────────────
export const PUBLIC_PORTFOLIO_BY_USER_NAME = gql`
  query PublicPortfolioByUserName($userName: String!) {
    getPublicProfileByUserName(userName: $userName) {
      status message
      data { userUuid userName fullName designation contactUsDescription email mobileNo address socialMedia { name url } }
    }
  }
`;

export const PUBLIC_PORTFOLIO_SECTIONS = gql`
  query PublicPortfolioSections($userUuid: String!) {
    getPublicAbout(userUuid: $userUuid) { status data { title description longDescription totalExperience totalProjects totalAwards } }
    getPublicExperiences(userUuid: $userUuid, limit: 50) { status data { id companyName companyUrl companyLocation designation startDate endDate isCurrentlyWorking jobDescription skills } }
    getPublicProjects(userUuid: $userUuid, limit: 50) { status data { id projectName projectDescription projectUrl projectStartDate projectEndDate isCurrentProject technologiesSkills } }
    getPublicSkills(userUuid: $userUuid) { status data { id tittle skills } }
    getPublicAwards(userUuid: $userUuid) { status data { id title description eventDate } }
    getPublicEducation(userUuid: $userUuid) { status data { id degree fieldOfStudy institution institutionLocation startYear endYear } }
    getPublicImages(userUuid: $userUuid, limit: 12) { status data { id imageUrl imageOriginalName } }
  }
`;

export const SUBMIT_CONTACT_MESSAGE = gql`
  query SubmitContactMessage($userUuid: String!, $senderName: String!, $senderEmail: String!, $message: String!) {
    submitContactMessage(userUuid: $userUuid, senderName: $senderName, senderEmail: $senderEmail, message: $message) { status message }
  }
`;

// ─── Templates marketplace ───────────────────────────
const TEMPLATE_FIELDS = "id name slug designKey category description tags originalPrice discountPrice isActive sortOrder";

export const TEMPLATES = gql`
  query Templates($category: String) {
    templates(category: $category) { status message data { ${TEMPLATE_FIELDS} } }
  }
`;

export const TEMPLATE_BY_SLUG = gql`
  query TemplateBySlug($slug: String!) {
    template(slug: $slug) { status message data { ${TEMPLATE_FIELDS} } }
  }
`;

export const ADMIN_TEMPLATES = gql`
  query AdminTemplates { adminTemplates { status message data { ${TEMPLATE_FIELDS} createdAt } } }
`;

export const ADMIN_CREATE_TEMPLATE = gql`
  mutation AdminCreateTemplate($input: TemplateInput!) {
    adminCreateTemplate(input: $input) { status message data { id } }
  }
`;

export const ADMIN_UPDATE_TEMPLATE = gql`
  mutation AdminUpdateTemplate($id: Int!, $input: TemplateInput!) {
    adminUpdateTemplate(id: $id, input: $input) { status message data { id } }
  }
`;

export const ADMIN_DELETE_TEMPLATE = gql`
  mutation AdminDeleteTemplate($id: Int!) { adminDeleteTemplate(id: $id) { status message } }
`;

// ─── User website ────────────────────────────────────
const SITE_FIELDS = "templateId templateSlug templateName designKey contentJson isPublished publishedAt userName status reviewNote submittedAt reviewedAt";

export const MY_SITE = gql`
  query MySite { mySite { status message data { ${SITE_FIELDS} } } }
`;

export const SAVE_MY_SITE = gql`
  mutation SaveMySite($templateId: Int!, $contentJson: String!, $publish: Boolean) {
    saveMySite(templateId: $templateId, contentJson: $contentJson, publish: $publish) { status message data { ${SITE_FIELDS} } }
  }
`;

export const UNPUBLISH_MY_SITE = gql`
  mutation UnpublishMySite { unpublishMySite { status message } }
`;

export const PUBLISHED_SITE = gql`
  query PublishedSite($userName: String!) {
    publishedSite(userName: $userName) { status message data { ${SITE_FIELDS} } }
  }
`;

// ─── Admin: website approvals ────────────────────────
export const ADMIN_SITE_REVIEWS = gql`
  query AdminSiteReviews($status: String) {
    adminSiteReviews(status: $status) {
      status message
      data { userUuid userName fullName email templateName templateCategory designKey status isPublished submittedAt reviewedAt reviewNote publishedAt }
    }
  }
`;

export const ADMIN_SITE_REVIEW = gql`
  query AdminSiteReview($userUuid: String!) {
    adminSiteReview(userUuid: $userUuid) {
      status message
      data { userUuid userName fullName email templateName templateCategory designKey contentJson status isPublished submittedAt reviewedAt reviewNote }
    }
  }
`;

export const ADMIN_APPROVE_SITE = gql`
  mutation AdminApproveSite($userUuid: String!, $note: String) { adminApproveSite(userUuid: $userUuid, note: $note) { status message } }
`;

export const ADMIN_REJECT_SITE = gql`
  mutation AdminRejectSite($userUuid: String!, $note: String!) { adminRejectSite(userUuid: $userUuid, note: $note) { status message } }
`;

export const ADMIN_TAKE_DOWN_SITE = gql`
  mutation AdminTakeDownSite($userUuid: String!) { adminTakeDownSite(userUuid: $userUuid) { status message } }
`;

// ─── Masters (lookup lists) ──────────────────────────
const MASTER_OPTION_FIELDS = "id code label description parentId parentCode parentLabel isActive sortOrder";

export const MASTER_BUNDLE = gql`
  query MasterBundle($typeCodes: [String!]!) {
    masterBundle(typeCodes: $typeCodes) { status message data { typeCode typeName options { ${MASTER_OPTION_FIELDS} } } }
  }
`;

export const ADMIN_MASTER_TYPES = gql`
  query AdminMasterTypes {
    adminMasterTypes {
      status message
      data { id code name description parentTypeId parentTypeCode isSystem isActive sortOrder valueCount activeCount }
    }
  }
`;

export const ADMIN_CREATE_MASTER_TYPE = gql`
  mutation AdminCreateMasterType($input: MasterTypeInput!) {
    adminCreateMasterType(input: $input) { status message data { id } }
  }
`;

export const ADMIN_UPDATE_MASTER_TYPE = gql`
  mutation AdminUpdateMasterType($id: Int!, $input: MasterTypeInput!) {
    adminUpdateMasterType(id: $id, input: $input) { status message data { id } }
  }
`;

export const ADMIN_DELETE_MASTER_TYPE = gql`
  mutation AdminDeleteMasterType($id: Int!) { adminDeleteMasterType(id: $id) { status message } }
`;

export const ADMIN_MASTER_VALUES = gql`
  query AdminMasterValues($typeId: Int!, $search: String, $status: String) {
    adminMasterValues(typeId: $typeId, search: $search, status: $status) { status message total data { ${MASTER_OPTION_FIELDS} } }
  }
`;

export const ADMIN_CREATE_MASTER_VALUE = gql`
  mutation AdminCreateMasterValue($typeId: Int!, $input: MasterValueInput!) {
    adminCreateMasterValue(typeId: $typeId, input: $input) { status message data { id } }
  }
`;

export const ADMIN_UPDATE_MASTER_VALUE = gql`
  mutation AdminUpdateMasterValue($id: Int!, $input: MasterValueInput!) {
    adminUpdateMasterValue(id: $id, input: $input) { status message data { id } }
  }
`;

export const ADMIN_SET_MASTER_VALUES_ACTIVE = gql`
  mutation AdminSetMasterValuesActive($ids: [Int!]!, $isActive: Boolean!) {
    adminSetMasterValuesActive(ids: $ids, isActive: $isActive) { status message }
  }
`;

export const ADMIN_DELETE_MASTER_VALUES = gql`
  mutation AdminDeleteMasterValues($ids: [Int!]!) { adminDeleteMasterValues(ids: $ids) { status message } }
`;

export const ADMIN_BULK_ADD_MASTER_VALUES = gql`
  mutation AdminBulkAddMasterValues($typeId: Int!, $labels: [String!]!, $parentId: Int) {
    adminBulkAddMasterValues(typeId: $typeId, labels: $labels, parentId: $parentId) { status message created skipped }
  }
`;

export const ADMIN_REORDER_MASTER_VALUES = gql`
  mutation AdminReorderMasterValues($items: [MasterOrderInput!]!) {
    adminReorderMasterValues(items: $items) { status message }
  }
`;

// ─── Analytics ───────────────────────────────────────
export const TRACK_PAGE_VIEW = gql`
  mutation TrackPageView($input: PageViewInput!) { trackPageView(input: $input) { status } }
`;

const PAIR = "{ current previous }";

export const ADMIN_ANALYTICS = gql`
  query AdminAnalytics($range: String!) {
    adminAnalytics(range: $range) {
      status message
      data {
        range bucket from to
        kpis {
          apiCalls ${PAIR} apiSuccess ${PAIR} apiFailed ${PAIR} apiErrors ${PAIR} successRate ${PAIR}
          avgLatencyMs ${PAIR} p95LatencyMs ${PAIR} pageViews ${PAIR} visitors ${PAIR} newVisitors ${PAIR}
          sessions ${PAIR} bounceRate ${PAIR} signedInUsers ${PAIR} newUsers ${PAIR} logins ${PAIR}
          failedLogins ${PAIR} siteSubmissions ${PAIR} sitesPublished ${PAIR} contactMessages ${PAIR} mutations ${PAIR}
        }
        totals { totalUsers activeAccounts admins totalTemplates activeTemplates publishedSites pendingApprovals totalImages contactMessages masterValues }
        series { bucket apiSuccess apiFailed apiErrors avgLatencyMs p95LatencyMs pageViews visitors newUsers logins }
        operations { operationName operationType calls failed errors avgMs p95Ms lastCalledAt }
        topErrors { operationName status message count lastSeenAt }
        topPages { path pageType views visitors }
        pageTypes { label count }
        referrers { label count }
        devices { label count }
        browsers { label count }
        operatingSystems { label count }
        activityByCategory { label count }
        topActors { label count }
        busiestTimes { weekday hour count }
      }
    }
  }
`;

export const ADMIN_API_EVENTS = gql`
  query AdminApiEvents($filter: ApiEventFilter) {
    adminApiEvents(filter: $filter) {
      status message total operations
      data { id operationName operationType fields status errorMessage errorCode durationMs userUuid userEmail role ip userAgent createdAt }
    }
  }
`;

export const ADMIN_ACTIVITY_LOGS = gql`
  query AdminActivityLogs($filter: ActivityLogFilter) {
    adminActivityLogs(filter: $filter) {
      status message total actions
      data { id actorUuid actorEmail actorRole action category status message target metadata ip createdAt }
    }
  }
`;

// ─── Admin: user list ────────────────────────────────
export const ADMIN_USERS = gql`
  query AdminUsers($filter: AdminUserFilter) {
    adminUsers(filter: $filter) {
      status message total
      summary { total active inactive admins newLast30Days published pendingApproval activeLast7Days }
      data {
        id userUuid fullName userName designation email mobileNo role isActive siteStatus isPublished
        templateName imageCount sectionsFilled lastActiveAt createdAt
      }
    }
  }
`;

export const ADMIN_SET_USERS_ACTIVE = gql`
  mutation AdminSetUsersActive($uuids: [String!]!, $isActive: Boolean!) {
    adminSetUsersActive(uuids: $uuids, isActive: $isActive) { status message }
  }
`;

export const ADMIN_SET_USER_ROLE = gql`
  mutation AdminSetUserRole($uuid: String!, $role: String!) {
    adminSetUserRole(uuid: $uuid, role: $role) { status message }
  }
`;

// ─── Messages ────────────────────────────────────────
const INBOX_FIELDS = `
  status message total
  counts { inbox unread starred archived all }
  data { id senderName senderEmail message isRead isStarred isArchived source createdAt readAt recipientUuid recipientName recipientUserName recipientEmail }
`;

export const SEND_CONTACT_MESSAGE = gql`
  mutation SendContactMessage($input: ContactMessageInput!) { sendContactMessage(input: $input) { status message } }
`;

export const MY_MESSAGES = gql`
  query MyMessages($filter: InboxFilter) { myMessages(filter: $filter) { ${INBOX_FIELDS} } }
`;

export const UPDATE_MY_MESSAGES = gql`
  mutation UpdateMyMessages($ids: [Int!]!, $action: String!) { updateMyMessages(ids: $ids, action: $action) { status message } }
`;

export const ADMIN_MESSAGES = gql`
  query AdminMessages($filter: InboxFilter) { adminMessages(filter: $filter) { ${INBOX_FIELDS} } }
`;

export const ADMIN_UPDATE_MESSAGES = gql`
  mutation AdminUpdateMessages($ids: [Int!]!, $action: String!) { adminUpdateMessages(ids: $ids, action: $action) { status message } }
`;

export const NAV_COUNTS = gql`
  query NavCounts($scope: String!) { navCounts(scope: $scope) { unreadMessages pendingApprovals newMessages newBookings newDriverApplications pendingReviews newFormSubmissions newLeads } }
`;

// ─── Travels / taxi booking ──────────────────────────
export const PLACE_SEARCH = gql`
  query PlaceSearch($query: String!, $lang: String!) { placeSearch(query: $query, lang: $lang) { status message data { label detail lat lon } } }
`;

export const PLACE_REVERSE = gql`
  query PlaceReverse($lat: Float!, $lon: Float!, $lang: String!) { placeReverse(lat: $lat, lon: $lon, lang: $lang) { status message data { label detail lat lon } } }
`;

const QUOTE_FIELDS = `
  tripType requestedType distanceKm durationMin tollCount tollNames tollPerPlaza tollAmount days chargeableKm
  ratePerKm kmFare driverBata totalFare vehicleName notes approximate tolls { name lat lon } path
`;

export const TRIP_QUOTE = gql`
  query TripQuote($input: TripQuoteInput!) { tripQuote(input: $input) { status message data { ${QUOTE_FIELDS} } } }
`;

export const CREATE_TRIP_BOOKING = gql`
  mutation CreateTripBooking($input: TripBookingInput!) {
    createTripBooking(input: $input) {
      status message bookingRef whatsapp
      quote { ${QUOTE_FIELDS} }
      driver { name phone licenseNumber licenseValidTill experienceYears }
    }
  }
`;

const BOOKING_FIELDS = `
  id bookingRef status customerName customerPhone customerEmail tripType fromLabel fromLat fromLon toLabel toLat toLon
  pickupAt returnAt passengers vehicleName driverName driverPhone distanceKm durationMin tollCount tollAmount
  chargeableKm ratePerKm kmFare driverBata days totalFare notes ownerNote lang createdAt
`;

export const MY_TRIP_BOOKINGS = gql`
  query MyTripBookings($filter: TripBookingFilter) {
    myTripBookings(filter: $filter) { status message total counts { new confirmed completed cancelled all } data { ${BOOKING_FIELDS} } }
  }
`;

export const UPDATE_MY_TRIP_BOOKING = gql`
  mutation UpdateMyTripBooking($id: Int!, $status: String, $ownerNote: String) {
    updateMyTripBooking(id: $id, status: $status, ownerNote: $ownerNote) { status message }
  }
`;

// ─── Driver applications (travels owners) ────────────
export const MY_DRIVER_APPLICATIONS = gql`
  query MyDriverApplications($status: String, $search: String) {
    myDriverApplications(status: $status, search: $search) {
      status message total counts { new shortlisted hired rejected all }
      data {
        id ref status fullName phone email age area experienceYears licenseNumber licenseType licenseValidTill vehicleTypes languages
        availability tripPreference expectedSalary ownVehicle about photoUrl licenseFrontUrl licenseBackUrl ownerNote lang createdAt
      }
    }
  }
`;

export const UPDATE_MY_DRIVER_APPLICATION = gql`
  mutation UpdateMyDriverApplication($id: Int!, $status: String, $ownerNote: String) {
    updateMyDriverApplication(id: $id, status: $status, ownerNote: $ownerNote) { status message }
  }
`;

export const DELETE_MY_DRIVER_APPLICATION = gql`
  mutation DeleteMyDriverApplication($id: Int!) { deleteMyDriverApplication(id: $id) { status message } }
`;

// ─── Ratings & reviews / custom forms ────────────────
export const PUBLIC_REVIEWS = gql`
  query PublicReviews($userName: String!) {
    publicReviews(userName: $userName) {
      status message
      summary { typeId target targetId avg count criteria { id avg } }
      reviews { id typeId target targetId rating criteria comment reviewerName ownerReply createdAt }
    }
  }
`;

export const SUBMIT_REVIEW = gql`
  mutation SubmitReview($input: ReviewInput!) { submitReview(input: $input) { status message } }
`;

export const SUBMIT_SITE_FORM = gql`
  mutation SubmitSiteForm($input: FormSubmissionInput!) {
    submitSiteForm(input: $input) { status message ref whatsapp answers { fieldId label value } }
  }
`;

export const MY_REVIEWS = gql`
  query MyReviews($status: String) {
    myReviews(status: $status) {
      status message average counts { pending approved hidden all }
      data { id typeId typeLabel target targetId targetName rating criteria comment reviewerName reviewerPhone ownerReply status createdAt }
    }
  }
`;

export const MODERATE_MY_REVIEW = gql`
  mutation ModerateMyReview($id: Int!, $status: String, $ownerReply: String) {
    moderateMyReview(id: $id, status: $status, ownerReply: $ownerReply) { status message }
  }
`;

export const DELETE_MY_REVIEW = gql`
  mutation DeleteMyReview($id: Int!) { deleteMyReview(id: $id) { status message } }
`;

export const MY_FORM_SUBMISSIONS = gql`
  query MyFormSubmissions($formId: String, $status: String) {
    myFormSubmissions(formId: $formId, status: $status) {
      status message counts { new done archived all }
      forms { fieldId label }
      data { id ref formId formTitle answers { fieldId label value } status ownerNote lang createdAt }
    }
  }
`;

export const UPDATE_MY_FORM_SUBMISSION = gql`
  mutation UpdateMyFormSubmission($id: Int!, $status: String, $ownerNote: String) {
    updateMyFormSubmission(id: $id, status: $status, ownerNote: $ownerNote) { status message }
  }
`;

export const DELETE_MY_FORM_SUBMISSION = gql`
  mutation DeleteMyFormSubmission($id: Int!) { deleteMyFormSubmission(id: $id) { status message } }
`;

// ─── Platform "Contact us" enquiries ─────────────────
export const CONTACT_PLATFORM = gql`
  mutation ContactPlatform($input: PlatformLeadInput!) { contactPlatform(input: $input) { status message ref whatsapp } }
`;

export const ADMIN_PLATFORM_LEADS = gql`
  query AdminPlatformLeads($status: String, $search: String) {
    adminPlatformLeads(status: $status, search: $search) {
      status message total counts { new contacted converted closed all }
      data { id ref name phone email purpose message source pageUrl status adminNote lang createdAt }
    }
  }
`;

export const ADMIN_UPDATE_PLATFORM_LEAD = gql`
  mutation AdminUpdatePlatformLead($id: Int!, $status: String, $adminNote: String) {
    adminUpdatePlatformLead(id: $id, status: $status, adminNote: $adminNote) { status message }
  }
`;

export const ADMIN_DELETE_PLATFORM_LEAD = gql`
  mutation AdminDeletePlatformLead($id: Int!) { adminDeletePlatformLead(id: $id) { status message } }
`;
