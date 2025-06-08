import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { AlumniData } from '../types';

interface DashboardProps {
  data: AlumniData[];
  onExport: (format: 'csv' | 'json') => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onExport }) => {
  const [profiles, setProfiles] = useState<AlumniData[]>(data);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [sortField, setSortField] = useState<keyof AlumniData>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  // Update profiles when data changes
  useEffect(() => {
    setProfiles(data);
    setLoading(false);

    // Extract unique companies and locations
    const companies = Array.from(new Set(data.map(p => p.company).filter(Boolean))) as string[];
    const locations = Array.from(new Set(data.map(p => p.location).filter(Boolean))) as string[];
    
    setAvailableCompanies(companies);
    setAvailableLocations(locations);
  }, [data]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleSort = (field: keyof AlumniData) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/profiles');
      if (!response.ok) throw new Error('Failed to refresh profiles');
      const data = await response.json();
      setProfiles(data);
    } catch (err) {
      console.error('Refresh error:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh profiles');
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpand = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  // Filter and sort profiles
  const filteredProfiles = profiles
    .filter((profile) => {
      const matchesSearch = 
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCompany = !companyFilter || profile.company === companyFilter;
      const matchesLocation = !locationFilter || profile.location === locationFilter;

      return matchesSearch && matchesCompany && matchesLocation;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return 0;
    });

  const paginatedProfiles = filteredProfiles.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Alumni Dashboard
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Profiles
              </Typography>
              <Typography variant="h5">
                {profiles.length}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Successful Scrapes
              </Typography>
              <Typography variant="h5">
                {profiles.filter(p => p.status === 'success').length}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Failed Scrapes
              </Typography>
              <Typography variant="h5">
                {profiles.filter(p => p.status === 'failed').length}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Last Updated
              </Typography>
              <Typography variant="h5">
                {profiles.length > 0
                  ? format(new Date(profiles[0].scrapedAt), 'MMM d, yyyy HH:mm')
                  : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearch}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Company</InputLabel>
            <Select
              value={companyFilter}
              label="Company"
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <MenuItem value="">All Companies</MenuItem>
              {availableCompanies.map((company) => (
                <MenuItem key={company} value={company}>
                  {company}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Location</InputLabel>
            <Select
              value={locationFilter}
              label="Location"
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <MenuItem value="">All Locations</MenuItem>
              {availableLocations.map((location) => (
                <MenuItem key={location} value={location}>
                  {location}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => onExport('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => onExport('json')}
          >
            Export JSON
          </Button>
        </Box>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>
                  <Button
                    onClick={() => handleSort('name')}
                    sx={{ color: 'inherit', fontWeight: 'bold' }}
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => handleSort('title')}
                    sx={{ color: 'inherit', fontWeight: 'bold' }}
                  >
                    Title {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => handleSort('company')}
                    sx={{ color: 'inherit', fontWeight: 'bold' }}
                  >
                    Company {sortField === 'company' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => handleSort('location')}
                    sx={{ color: 'inherit', fontWeight: 'bold' }}
                  >
                    Location {sortField === 'location' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No profiles found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProfiles.map((profile) => (
                  <React.Fragment key={profile.id}>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpand(profile.id)}
                        >
                          {expandedRows.has(profile.id) ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>{profile.name}</TableCell>
                      <TableCell>{profile.title}</TableCell>
                      <TableCell>{profile.company}</TableCell>
                      <TableCell>{profile.location}</TableCell>
                      <TableCell>
                        <Chip
                          label={profile.status}
                          color={profile.status === 'success' ? 'success' : profile.status === 'failed' ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View LinkedIn Profile">
                          <IconButton
                            size="small"
                            onClick={() => window.open(profile.linkedinUrl, '_blank')}
                          >
                            <img
                              src="/linkedin-icon.png"
                              alt="LinkedIn"
                              style={{ width: 20, height: 20 }}
                            />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={expandedRows.has(profile.id)} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Profile Details
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                              <Box>
                                <Typography variant="subtitle1">Summary</Typography>
                                <Typography variant="body2" paragraph>
                                  {profile.summary || 'No summary available'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="subtitle1">Education</Typography>
                                {profile.education.length > 0 ? (
                                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {profile.education.map((edu, index) => (
                                      <li key={index}>
                                        <Typography variant="body2">{edu}</Typography>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <Typography variant="body2">No education information available</Typography>
                                )}
                              </Box>
                              <Box>
                                <Typography variant="subtitle1">Past Roles</Typography>
                                {profile.pastRoles.length > 0 ? (
                                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {profile.pastRoles.map((role, index) => (
                                      <li key={index}>
                                        <Typography variant="body2">
                                          {role.title} at {role.company}
                                          {role.years && ` (${role.years})`}
                                        </Typography>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <Typography variant="body2">No past roles available</Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredProfiles.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Box>
    </Container>
  );
};

export default Dashboard;